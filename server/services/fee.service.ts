import { FeeRepository } from "../repositories/fee.repository";
import { PaymentRepository } from "../repositories/payment.repository";
import { prisma } from "@/lib/db/prisma";
import { NotFoundError, BadRequestError } from "@/lib/utils/api-response";

export class FeeService {
  /**
   * Calculate breakdown for a student given their fee structures and active discounts.
   * Supports:
   * - Fee head base sum
   * - Custom structure override amount
   * - Percentage & fixed discounts (e.g. Sibling discount, Staff concession)
   * - Arrears carried forward
   * - Late fee evaluation based on due date
   */
  static async calculateStudentFeeBreakdown(params: {
    organizationId: string;
    studentId: string;
    academicYearId: string;
    targetDueDate?: Date;
  }) {
    // 1. Fetch student assignments
    const assignments = await FeeRepository.getStudentFeeAssignments(
      params.studentId,
      params.organizationId
    );

    const yearAssignments = assignments.filter(
      (a) => a.academicYearId === params.academicYearId
    );

    if (yearAssignments.length === 0) {
      throw new BadRequestError("Student has no fee structure assigned for this academic year");
    }

    // 2. Fetch active discounts
    const studentDiscounts = await FeeRepository.getStudentDiscounts(params.studentId);

    // 3. Aggregate item breakdown
    const items: { feeHeadId: string; name: string; amount: number }[] = [];
    let subtotal = 0;

    for (const assign of yearAssignments) {
      if (assign.customAmount && Number(assign.customAmount) > 0) {
        // Custom override amount
        const override = Number(assign.customAmount);
        subtotal += override;
        items.push({
          feeHeadId: assign.feeStructure.items[0]?.feeHeadId || "CUSTOM",
          name: `${assign.feeStructure.name} (Custom Rate)`,
          amount: override,
        });
      } else {
        for (const item of assign.feeStructure.items) {
          const amt = Number(item.amount);
          subtotal += amt;
          items.push({
            feeHeadId: item.feeHeadId,
            name: item.feeHead.name,
            amount: amt,
          });
        }
      }
    }

    // 4. Calculate discount reductions
    let discountAmount = 0;
    const discountBreakdown: { name: string; amount: number }[] = [];

    for (const sd of studentDiscounts) {
      const disc = sd.discount;
      let discVal = 0;
      if (disc.type === "PERCENTAGE") {
        discVal = (subtotal * Number(disc.value)) / 100;
      } else {
        discVal = Number(disc.value);
      }
      discVal = Math.min(discVal, subtotal - discountAmount);
      if (discVal > 0) {
        discountAmount += discVal;
        discountBreakdown.push({
          name: disc.name,
          amount: discVal,
        });
      }
    }

    // 5. Calculate outstanding arrears from past unpaid/overdue invoices
    const arrearsAmount = await FeeRepository.getStudentOutstandingBalance(
      params.studentId,
      params.organizationId
    );

    // 6. Calculate late fee if past due date
    let lateFeeAmount = 0;
    if (params.targetDueDate && new Date() > params.targetDueDate) {
      const lateFeeRule = await FeeRepository.getLateFeeRule(params.organizationId);
      if (lateFeeRule) {
        const diffMs = new Date().getTime() - params.targetDueDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays > lateFeeRule.graceDays) {
          const chargeableDays = diffDays - lateFeeRule.graceDays;
          if (lateFeeRule.type === "DAILY") {
            lateFeeAmount = chargeableDays * Number(lateFeeRule.amount);
          } else if (lateFeeRule.type === "FIXED_ONE_TIME") {
            lateFeeAmount = Number(lateFeeRule.amount);
          }
          if (lateFeeRule.maxAmount && lateFeeAmount > Number(lateFeeRule.maxAmount)) {
            lateFeeAmount = Number(lateFeeRule.maxAmount);
          }
        }
      }
    }

    const totalAmount = Math.max(0, subtotal - discountAmount + arrearsAmount + lateFeeAmount);

    return {
      subtotal,
      discountAmount,
      discountBreakdown,
      arrearsAmount,
      lateFeeAmount,
      totalAmount,
      items,
    };
  }

  /**
   * Bulk generate Challans/Invoices for a class, section, or student
   */
  static async generateInvoicesBulk(params: {
    organizationId: string;
    campusId: string;
    academicYearId: string;
    classId?: string | null;
    sectionId?: string | null;
    studentId?: string | null;
    title: string;
    issueDate: Date;
    dueDate: Date;
    notes?: string;
  }) {
    // Determine student population
    let studentIds: string[] = [];

    if (params.studentId) {
      studentIds = [params.studentId];
    } else if (params.classId || params.sectionId) {
      const enrollments = await prisma.studentEnrollment.findMany({
        where: {
          organizationId: params.organizationId,
          campusId: params.campusId,
          academicYearId: params.academicYearId,
          status: "ACTIVE",
          deletedAt: null,
          ...(params.classId ? { classId: params.classId } : {}),
          ...(params.sectionId ? { sectionId: params.sectionId } : {}),
        },
        select: { studentId: true },
      });
      studentIds = enrollments.map((e) => e.studentId);
    } else {
      // All active enrolled students in campus
      const enrollments = await prisma.studentEnrollment.findMany({
        where: {
          organizationId: params.organizationId,
          campusId: params.campusId,
          academicYearId: params.academicYearId,
          status: "ACTIVE",
          deletedAt: null,
        },
        select: { studentId: true },
      });
      studentIds = enrollments.map((e) => e.studentId);
    }

    if (studentIds.length === 0) {
      throw new BadRequestError("No enrolled students found matching the criteria");
    }

    const generatedInvoices = [];

    for (const sId of studentIds) {
      try {
        const breakdown = await this.calculateStudentFeeBreakdown({
          organizationId: params.organizationId,
          studentId: sId,
          academicYearId: params.academicYearId,
          targetDueDate: params.dueDate,
        });

        const invoiceCount = await prisma.feeInvoice.count({
          where: { organizationId: params.organizationId },
        });
        const invoiceNumber = `CH-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(5, "0")}`;

        const invoice = await FeeRepository.createInvoice({
          organizationId: params.organizationId,
          campusId: params.campusId,
          studentId: sId,
          academicYearId: params.academicYearId,
          classId: params.classId,
          invoiceNumber,
          title: params.title,
          issueDate: params.issueDate,
          dueDate: params.dueDate,
          subtotal: breakdown.subtotal,
          discountAmount: breakdown.discountAmount,
          lateFeeAmount: breakdown.lateFeeAmount,
          arrearsAmount: breakdown.arrearsAmount,
          totalAmount: breakdown.totalAmount,
          balanceAmount: breakdown.totalAmount,
          notes: params.notes,
          items: breakdown.items.map((i) => ({
            feeHeadId: i.feeHeadId,
            description: i.name,
            amount: i.amount,
          })),
        });

        generatedInvoices.push(invoice);
      } catch (err) {
        // Skip students without valid fee structures
        continue;
      }
    }

    return {
      totalGenerated: generatedInvoices.length,
      invoices: generatedInvoices,
    };
  }

  /**
   * WhatsApp MVP Share Helper:
   * Generates secure receipt URL and pre-filled wa.me URL
   */
  static generateWhatsAppReceiptShareLink(params: {
    recipientPhone?: string | null;
    studentName: string;
    receiptNumber: string;
    amount: number;
    currency: string;
    accessToken: string;
    baseUrl: string;
  }) {
    const receiptUrl = `${params.baseUrl}/receipts/${params.accessToken}`;
    const cleanPhone = (params.recipientPhone || "").replace(/[^0-9]/g, "");

    const message = encodeURIComponent(
      `Hello! Here is the official fee payment receipt for ${params.studentName}.\n\n` +
      `Receipt No: ${params.receiptNumber}\n` +
      `Amount Paid: ${params.currency} ${params.amount.toFixed(2)}\n` +
      `View / Download Official Receipt: ${receiptUrl}\n\n` +
      `Thank you!`
    );

    const waLink = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;

    return {
      receiptUrl,
      whatsappShareLink: waLink,
    };
  }
}
