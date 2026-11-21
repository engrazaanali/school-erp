import { z } from "zod";

// Payment collection schema
export const collectPaymentSchema = z.object({
  campusId: z.string().uuid("Invalid campus ID").optional(),
  studentId: z.string().uuid("Invalid student ID"),
  invoiceId: z.string().uuid("Invalid invoice ID"),
  amount: z.number().positive("Payment amount must be greater than zero"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "ONLINE", "CHEQUE", "POS"]).default("CASH"),
  referenceNumber: z.string().max(100).optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
});

// Refund / Reversal schema
export const refundPaymentSchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID"),
  amount: z.number().positive("Refund amount must be greater than zero"),
  reason: z.string().min(3, "Refund reason is mandatory").max(255),
});

// Void Invoice schema
export const voidInvoiceSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID"),
  reason: z.string().min(3, "Void reason is mandatory").max(255),
});
