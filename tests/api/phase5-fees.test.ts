import { describe, it, expect, vi, beforeEach } from "vitest";
import { FeeService } from "@/server/services/fee.service";
import { PaymentRepository } from "@/server/repositories/payment.repository";
import { FeeRepository } from "@/server/repositories/fee.repository";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => {
  return {
    prisma: {
      $transaction: vi.fn(),
      feeInvoice: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      payment: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      paymentAllocation: {
        create: vi.fn(),
      },
      receipt: {
        findUnique: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
      },
      refund: {
        count: vi.fn(),
        create: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      studentFeeAssignment: {
        findMany: vi.fn(),
        upsert: vi.fn(),
      },
      studentDiscount: {
        findMany: vi.fn(),
        upsert: vi.fn(),
      },
      lateFeeRule: {
        findFirst: vi.fn(),
      },
    },
  };
});

describe("Phase 5: Financial Engine, Atomic Payment Transactions & Tenant Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Fee Breakdown & Calculation Math", () => {
    it("correctly calculates base tuition, percentage discounts, and late fees", async () => {
      // Mock student fee assignment: Tuition = 1000, Transport = 200 (Total 1200)
      vi.spyOn(FeeRepository, "getStudentFeeAssignments").mockResolvedValue([
        {
          id: "assign-1",
          organizationId: "org-1",
          campusId: "campus-1",
          studentId: "student-1",
          feeStructureId: "struct-1",
          academicYearId: "year-1",
          classId: "class-1",
          customAmount: null,
          status: "ACTIVE",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          feeStructure: {
            id: "struct-1",
            organizationId: "org-1",
            campusId: "campus-1",
            academicYearId: "year-1",
            classId: "class-1",
            name: "Standard Tuition",
            frequency: "MONTHLY",
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            items: [
              {
                id: "item-1",
                feeStructureId: "struct-1",
                feeHeadId: "head-1",
                amount: 1000 as any,
                createdAt: new Date(),
                updatedAt: new Date(),
                feeHead: { name: "Tuition" } as any,
              },
              {
                id: "item-2",
                feeStructureId: "struct-1",
                feeHeadId: "head-2",
                amount: 200 as any,
                createdAt: new Date(),
                updatedAt: new Date(),
                feeHead: { name: "Transport" } as any,
              },
            ],
          },
        } as any,
      ]);

      // Mock 20% sibling discount on subtotal (1200 * 20% = 240 discount)
      vi.spyOn(FeeRepository, "getStudentDiscounts").mockResolvedValue([
        {
          id: "sd-1",
          studentId: "student-1",
          discountId: "disc-1",
          discount: {
            name: "Sibling 20%",
            type: "PERCENTAGE",
            value: 20 as any,
          },
        } as any,
      ]);

      // Outstanding arrears = 50
      vi.spyOn(FeeRepository, "getStudentOutstandingBalance").mockResolvedValue(50);

      // Late fee = none since targetDueDate is in future
      const futureDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const result = await FeeService.calculateStudentFeeBreakdown({
        organizationId: "org-1",
        studentId: "student-1",
        academicYearId: "year-1",
        targetDueDate: futureDueDate,
      });

      expect(result.subtotal).toBe(1200);
      expect(result.discountAmount).toBe(240);
      expect(result.arrearsAmount).toBe(50);
      expect(result.lateFeeAmount).toBe(0);
      // Net: 1200 - 240 + 50 = 1010
      expect(result.totalAmount).toBe(1010);
    });

    it("applies daily late fee after grace period expires", async () => {
      vi.spyOn(FeeRepository, "getStudentFeeAssignments").mockResolvedValue([
        {
          id: "assign-1",
          organizationId: "org-1",
          campusId: "campus-1",
          studentId: "student-1",
          academicYearId: "year-1",
          customAmount: null,
          feeStructure: {
            name: "Tuition",
            items: [
              {
                feeHeadId: "h-1",
                amount: 500 as any,
                feeHead: { name: "Tuition" },
              },
            ],
          },
        } as any,
      ]);

      vi.spyOn(FeeRepository, "getStudentDiscounts").mockResolvedValue([]);
      vi.spyOn(FeeRepository, "getStudentOutstandingBalance").mockResolvedValue(0);

      // Past due date: 15 days ago
      const pastDueDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

      // Grace period: 10 days, daily late fee: $10/day -> 5 days * $10 = $50
      vi.spyOn(FeeRepository, "getLateFeeRule").mockResolvedValue({
        id: "lfr-1",
        organizationId: "org-1",
        campusId: "campus-1",
        name: "Standard Daily Late Fee",
        graceDays: 10,
        type: "DAILY",
        amount: 10 as any,
        maxAmount: 100 as any,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as any);

      const result = await FeeService.calculateStudentFeeBreakdown({
        organizationId: "org-1",
        studentId: "student-1",
        academicYearId: "year-1",
        targetDueDate: pastDueDate,
      });

      expect(result.subtotal).toBe(500);
      expect(result.lateFeeAmount).toBe(50);
      expect(result.totalAmount).toBe(550);
    });
  });

  describe("Atomic Payment Collection ($transaction)", () => {
    it("executes full transactional payment -> allocation -> receipt -> invoice update -> audit log", async () => {
      const mockInvoice = {
        id: "inv-1",
        organizationId: "org-1",
        campusId: "campus-1",
        studentId: "student-1",
        invoiceNumber: "CH-2026-0001",
        balanceAmount: 500 as any,
        paidAmount: 0 as any,
      };

      const mockTx = {
        feeInvoice: {
          findFirst: vi.fn().mockResolvedValue(mockInvoice),
          update: vi.fn().mockResolvedValue({
            ...mockInvoice,
            paidAmount: 500,
            balanceAmount: 0,
            status: "PAID",
          }),
        },
        payment: {
          count: vi.fn().mockResolvedValue(0),
          create: vi.fn().mockResolvedValue({
            id: "pay-1",
            paymentNumber: "PAY-2026-00001",
            amount: 500,
            status: "COMPLETED",
          }),
        },
        paymentAllocation: {
          create: vi.fn().mockResolvedValue({ id: "alloc-1" }),
        },
        receipt: {
          count: vi.fn().mockResolvedValue(0),
          create: vi.fn().mockResolvedValue({
            id: "rec-1",
            receiptNumber: "REC-2026-00001",
            accessToken: "secret-receipt-token-123",
          }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: "audit-1" }),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      const result = await PaymentRepository.collectPaymentAtomic({
        organizationId: "org-1",
        campusId: "campus-1",
        studentId: "student-1",
        invoiceId: "inv-1",
        amount: 500,
        paymentMethod: "CASH",
        receivedById: "user-accountant-1",
      });

      // Verify transaction steps
      expect(mockTx.payment.create).toHaveBeenCalled();
      expect(mockTx.paymentAllocation.create).toHaveBeenCalled();
      expect(mockTx.feeInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "inv-1" },
          data: expect.objectContaining({ status: "PAID", balanceAmount: expect.anything() }),
        })
      );
      expect(mockTx.receipt.create).toHaveBeenCalled();
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: "PAYMENT_COLLECTED" }),
        })
      );
      expect(result.receipt.accessToken).toBe("secret-receipt-token-123");
    });

    it("rejects payment if amount exceeds remaining invoice balance", async () => {
      const mockInvoice = {
        id: "inv-1",
        organizationId: "org-1",
        balanceAmount: 300 as any,
      };

      const mockTx = {
        feeInvoice: {
          findFirst: vi.fn().mockResolvedValue(mockInvoice),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      await expect(
        PaymentRepository.collectPaymentAtomic({
          organizationId: "org-1",
          campusId: "campus-1",
          studentId: "student-1",
          invoiceId: "inv-1",
          amount: 500, // exceeds 300
          paymentMethod: "CASH",
        })
      ).rejects.toThrow("exceeds invoice balance");
    });

    it("strictly isolates invoices across organizations (Tenant A cannot access Tenant B invoice)", async () => {
      // In Tenant A's context, looking for Tenant B invoice returns null
      const mockTx = {
        feeInvoice: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      await expect(
        PaymentRepository.collectPaymentAtomic({
          organizationId: "org-tenant-a",
          campusId: "campus-a",
          studentId: "student-b",
          invoiceId: "inv-tenant-b",
          amount: 100,
          paymentMethod: "CASH",
        })
      ).rejects.toThrow("Invoice not found or unauthorized");
    });
  });

  describe("Financial Reversals & WhatsApp Link Generation", () => {
    it("generates valid WhatsApp wa.me links with encoded parameters and receipt url", () => {
      const share = FeeService.generateWhatsAppReceiptShareLink({
        recipientPhone: "+1 (555) 019-2834",
        studentName: "John Doe",
        receiptNumber: "REC-2026-00042",
        amount: 250,
        currency: "USD",
        accessToken: "tok-abc-123",
        baseUrl: "https://school.example.com",
      });

      expect(share.receiptUrl).toBe("https://school.example.com/receipts/tok-abc-123");
      expect(share.whatsappShareLink).toContain("https://wa.me/15550192834?text=");
      expect(share.whatsappShareLink).toContain("John%20Doe");
      expect(share.whatsappShareLink).toContain("REC-2026-00042");
    });

    it("reverses financial invoice balance when payment is refunded", async () => {
      const mockPayment = {
        id: "pay-1",
        amount: 300 as any,
        status: "COMPLETED",
        studentId: "student-1",
        allocations: [{ invoiceId: "inv-1" }],
      };

      const mockInvoice = {
        id: "inv-1",
        paidAmount: 300 as any,
        balanceAmount: 0 as any,
      };

      const mockTx = {
        payment: {
          findFirst: vi.fn().mockResolvedValue(mockPayment),
          update: vi.fn().mockResolvedValue({ ...mockPayment, status: "REFUNDED" }),
        },
        refund: {
          count: vi.fn().mockResolvedValue(0),
          create: vi.fn().mockResolvedValue({ id: "ref-1", refundNumber: "REF-2026-00001" }),
        },
        feeInvoice: {
          findUnique: vi.fn().mockResolvedValue(mockInvoice),
          update: vi.fn().mockResolvedValue({}),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({}),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      await PaymentRepository.refundPaymentAtomic({
        organizationId: "org-1",
        campusId: "campus-1",
        paymentId: "pay-1",
        amount: 300,
        reason: "Duplicate payment collected in error",
        processedById: "user-admin-1",
      });

      expect(mockTx.refund.create).toHaveBeenCalled();
      expect(mockTx.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pay-1" },
          data: expect.objectContaining({ status: "REFUNDED" }),
        })
      );
      // Invoice must be reversed to UNPAID with restored balance
      expect(mockTx.feeInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "inv-1" },
          data: expect.objectContaining({ status: "UNPAID" }),
        })
      );
    });
  });
});
