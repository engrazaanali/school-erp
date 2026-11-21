import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import crypto from "crypto";

export interface PaymentListFilter {
  organizationId: string;
  campusId?: string;
  studentId?: string;
  paymentMethod?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

export class PaymentRepository {
  /**
   * ATOMIC PAYMENT TRANSACTION:
   * 1. Validate invoice exists and has positive balance.
   * 2. Insert Payment record.
   * 3. Insert PaymentAllocation record.
   * 4. Update FeeInvoice paidAmount, balanceAmount, status (PAID or PARTIAL).
   * 5. Generate secure unguessable accessToken and insert Receipt record.
   * 6. Insert AuditLog inside same transaction.
   * 7. Fully atomic: If any step fails, entire transaction rolls back.
   */
  static async collectPaymentAtomic(params: {
    organizationId: string;
    campusId: string;
    studentId: string;
    invoiceId: string;
    amount: number;
    paymentMethod: string;
    referenceNumber?: string | null;
    remarks?: string | null;
    receivedById?: string | null;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch invoice with lock / fresh data
      const invoice = await tx.feeInvoice.findFirst({
        where: {
          id: params.invoiceId,
          organizationId: params.organizationId,
          deletedAt: null,
        },
      });

      if (!invoice) {
        throw new Error("Invoice not found or unauthorized");
      }

      const currentBalance = Number(invoice.balanceAmount);
      if (currentBalance <= 0) {
        throw new Error("Invoice is already fully paid");
      }

      if (params.amount > currentBalance) {
        throw new Error(
          `Payment amount (${params.amount}) exceeds invoice balance (${currentBalance})`
        );
      }

      // Generate unique payment & receipt numbers
      const paymentCount = await tx.payment.count({
        where: { organizationId: params.organizationId },
      });
      const paymentNumber = `PAY-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(5, "0")}`;

      const receiptCount = await tx.receipt.count({
        where: { organizationId: params.organizationId },
      });
      const receiptNumber = `REC-${new Date().getFullYear()}-${String(receiptCount + 1).padStart(5, "0")}`;
      const accessToken = crypto.randomBytes(32).toString("hex");

      // 2. Insert Payment
      const payment = await tx.payment.create({
        data: {
          organizationId: params.organizationId,
          campusId: params.campusId,
          studentId: params.studentId,
          paymentNumber,
          paymentDate: new Date(),
          amount: new Prisma.Decimal(params.amount),
          paymentMethod: params.paymentMethod,
          referenceNumber: params.referenceNumber,
          remarks: params.remarks,
          receivedById: params.receivedById,
          status: "COMPLETED",
        },
      });

      // 3. Insert Payment Allocation
      await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          invoiceId: invoice.id,
          allocatedAmount: new Prisma.Decimal(params.amount),
        },
      });

      // 4. Update Invoice
      const newPaidAmount = Number(invoice.paidAmount) + params.amount;
      const newBalanceAmount = currentBalance - params.amount;
      const newStatus = newBalanceAmount <= 0 ? "PAID" : "PARTIAL";

      const updatedInvoice = await tx.feeInvoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: new Prisma.Decimal(newPaidAmount),
          balanceAmount: new Prisma.Decimal(newBalanceAmount),
          status: newStatus,
        },
      });

      // 5. Insert Receipt
      const receipt = await tx.receipt.create({
        data: {
          organizationId: params.organizationId,
          campusId: params.campusId,
          paymentId: payment.id,
          receiptNumber,
          accessToken,
          issuedDate: new Date(),
        },
      });

      // 6. Audit Log
      await tx.auditLog.create({
        data: {
          organizationId: params.organizationId,
          campusId: params.campusId,
          userId: params.receivedById,
          action: "PAYMENT_COLLECTED",
          resource: "Payment",
          resourceId: payment.id,
          newValues: {
            paymentNumber,
            receiptNumber,
            invoiceNumber: invoice.invoiceNumber,
            amount: params.amount,
            method: params.paymentMethod,
            newInvoiceStatus: newStatus,
          },
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });

      return {
        payment,
        receipt,
        invoice: updatedInvoice,
      };
    });
  }

  /**
   * REFUND / REVERSAL TRANSACTION:
   * Rule 12: Never casually delete financial history.
   * This handles refunds by marking Payment status and reversing Invoice balances.
   */
  static async refundPaymentAtomic(params: {
    organizationId: string;
    campusId: string;
    paymentId: string;
    amount: number;
    reason: string;
    processedById?: string | null;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: {
          id: params.paymentId,
          organizationId: params.organizationId,
        },
        include: {
          allocations: true,
        },
      });

      if (!payment) {
        throw new Error("Payment record not found");
      }

      if (payment.status !== "COMPLETED") {
        throw new Error(`Cannot refund payment with status '${payment.status}'`);
      }

      const paymentAmount = Number(payment.amount);
      if (params.amount > paymentAmount) {
        throw new Error(`Refund amount (${params.amount}) exceeds original payment (${paymentAmount})`);
      }

      const refundCount = await tx.refund.count({
        where: { organizationId: params.organizationId },
      });
      const refundNumber = `REF-${new Date().getFullYear()}-${String(refundCount + 1).padStart(5, "0")}`;

      // 1. Create Refund record
      const refund = await tx.refund.create({
        data: {
          organizationId: params.organizationId,
          campusId: params.campusId,
          paymentId: payment.id,
          studentId: payment.studentId,
          refundNumber,
          amount: new Prisma.Decimal(params.amount),
          reason: params.reason,
          processedById: params.processedById,
          status: "COMPLETED",
        },
      });

      // 2. Mark payment as REFUNDED or partially reversed
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: params.amount === paymentAmount ? "REFUNDED" : "COMPLETED",
          remarks: `${payment.remarks || ""} [Refunded ${params.amount}: ${params.reason}]`.trim(),
        },
      });

      // 3. Reverse Invoice allocations
      for (const alloc of payment.allocations) {
        const invoice = await tx.feeInvoice.findUnique({
          where: { id: alloc.invoiceId },
        });
        if (invoice) {
          const revPaid = Math.max(0, Number(invoice.paidAmount) - params.amount);
          const revBalance = Number(invoice.balanceAmount) + params.amount;
          const revStatus = revPaid === 0 ? "UNPAID" : "PARTIAL";

          await tx.feeInvoice.update({
            where: { id: invoice.id },
            data: {
              paidAmount: new Prisma.Decimal(revPaid),
              balanceAmount: new Prisma.Decimal(revBalance),
              status: revStatus,
            },
          });
        }
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          organizationId: params.organizationId,
          campusId: params.campusId,
          userId: params.processedById,
          action: "PAYMENT_REFUNDED",
          resource: "Refund",
          resourceId: refund.id,
          newValues: {
            refundNumber,
            paymentNumber: payment.paymentNumber,
            amount: params.amount,
            reason: params.reason,
          },
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });

      return refund;
    });
  }

  /**
   * VOID INVOICE WORKFLOW:
   * Rule 12: Never delete financial records. Void instead of delete.
   */
  static async voidInvoiceAtomic(params: {
    organizationId: string;
    campusId: string;
    invoiceId: string;
    reason: string;
    voidedById?: string | null;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.feeInvoice.findFirst({
        where: {
          id: params.invoiceId,
          organizationId: params.organizationId,
          deletedAt: null,
        },
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      if (Number(invoice.paidAmount) > 0) {
        throw new Error("Cannot void an invoice that has payments. Refund or reverse payments first.");
      }

      const updated = await tx.feeInvoice.update({
        where: { id: invoice.id },
        data: {
          status: "VOID",
          notes: `${invoice.notes || ""} [Voided: ${params.reason}]`.trim(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: params.organizationId,
          campusId: params.campusId,
          userId: params.voidedById,
          action: "INVOICE_VOIDED",
          resource: "FeeInvoice",
          resourceId: invoice.id,
          newValues: {
            invoiceNumber: invoice.invoiceNumber,
            reason: params.reason,
          },
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });

      return updated;
    });
  }

  static async listPayments(filter: PaymentListFilter) {
    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {
      organizationId: filter.organizationId,
    };
    if (filter.campusId) where.campusId = filter.campusId;
    if (filter.studentId) where.studentId = filter.studentId;
    if (filter.paymentMethod) where.paymentMethod = filter.paymentMethod;
    if (filter.startDate || filter.endDate) {
      where.paymentDate = {};
      if (filter.startDate) where.paymentDate.gte = filter.startDate;
      if (filter.endDate) where.paymentDate.lte = filter.endDate;
    }
    if (filter.search) {
      where.OR = [
        { paymentNumber: { contains: filter.search, mode: "insensitive" } },
        { referenceNumber: { contains: filter.search, mode: "insensitive" } },
        { student: { admissionNumber: { contains: filter.search, mode: "insensitive" } } },
        { student: { person: { firstName: { contains: filter.search, mode: "insensitive" } } } },
        { student: { person: { lastName: { contains: filter.search, mode: "insensitive" } } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        include: {
          student: { include: { person: true } },
          allocations: { include: { invoice: true } },
          receipts: true,
        },
        orderBy: { paymentDate: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return { total, page, limit, items };
  }

  static async getReceiptByAccessToken(accessToken: string) {
    return prisma.receipt.findUnique({
      where: { accessToken },
      include: {
        organization: {
          include: {
            settings: true,
          },
        },
        campus: true,
        payment: {
          include: {
            student: {
              include: {
                person: true,
              },
            },
            allocations: {
              include: {
                invoice: {
                  include: {
                    items: {
                      include: {
                        feeHead: true,
                      },
                    },
                    class: true,
                    academicYear: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  static async getFinancialReportSummary(params: {
    organizationId: string;
    campusId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const wherePayment: Prisma.PaymentWhereInput = {
      organizationId: params.organizationId,
      status: "COMPLETED",
    };
    if (params.campusId) wherePayment.campusId = params.campusId;
    if (params.startDate || params.endDate) {
      wherePayment.paymentDate = {};
      if (params.startDate) wherePayment.paymentDate.gte = params.startDate;
      if (params.endDate) wherePayment.paymentDate.lte = params.endDate;
    }

    const whereInvoice: Prisma.FeeInvoiceWhereInput = {
      organizationId: params.organizationId,
      deletedAt: null,
    };
    if (params.campusId) whereInvoice.campusId = params.campusId;

    const [payments, invoices, refunds] = await Promise.all([
      prisma.payment.findMany({
        where: wherePayment,
        select: { amount: true, paymentMethod: true },
      }),
      prisma.feeInvoice.findMany({
        where: whereInvoice,
        select: {
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true,
          status: true,
        },
      }),
      prisma.refund.findMany({
        where: {
          organizationId: params.organizationId,
          ...(params.campusId ? { campusId: params.campusId } : {}),
          status: "COMPLETED",
        },
        select: { amount: true },
      }),
    ]);

    const totalCollected = payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const totalRefunded = refunds.reduce((acc, r) => acc + Number(r.amount), 0);
    const netCollected = totalCollected - totalRefunded;

    const totalInvoiced = invoices.reduce((acc, i) => acc + Number(i.totalAmount), 0);
    const totalOutstanding = invoices
      .filter((i) => i.status !== "VOID")
      .reduce((acc, i) => acc + Number(i.balanceAmount), 0);

    const defaultersCount = invoices.filter(
      (i) => (i.status === "UNPAID" || i.status === "PARTIAL" || i.status === "OVERDUE") && Number(i.balanceAmount) > 0
    ).length;

    // By payment method
    const byMethod: Record<string, number> = {};
    for (const p of payments) {
      byMethod[p.paymentMethod] = (byMethod[p.paymentMethod] || 0) + Number(p.amount);
    }

    return {
      totalInvoiced,
      totalCollected,
      totalRefunded,
      netCollected,
      totalOutstanding,
      defaultersCount,
      byMethod,
    };
  }
}
