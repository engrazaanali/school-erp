import { z } from "zod";

// Fee Head schemas
export const createFeeHeadSchema = z.object({
  campusId: z.string().uuid("Invalid campus ID").optional(),
  name: z.string().min(2, "Fee head name must be at least 2 characters").max(100),
  code: z.string().min(2, "Code must be at least 2 characters").max(20).toUpperCase(),
  type: z.enum(["RECURRING", "ONE_TIME", "OPTIONAL"]).default("RECURRING"),
  description: z.string().max(255).optional(),
});

export const updateFeeHeadSchema = createFeeHeadSchema.partial();

// Fee Structure Item schemas
export const feeStructureItemInputSchema = z.object({
  feeHeadId: z.string().uuid("Invalid fee head ID"),
  amount: z.number().min(0, "Amount must be greater than or equal to 0"),
});

// Fee Structure schemas
export const createFeeStructureSchema = z.object({
  campusId: z.string().uuid("Invalid campus ID").optional(),
  academicYearId: z.string().uuid("Invalid academic year ID"),
  classId: z.string().uuid("Invalid class ID").optional().nullable(),
  name: z.string().min(2, "Fee structure name must be at least 2 characters").max(100),
  frequency: z.enum(["MONTHLY", "QUARTERLY", "ANNUALLY", "ONE_TIME"]).default("MONTHLY"),
  items: z.array(feeStructureItemInputSchema).min(1, "Fee structure must contain at least one fee head item"),
});

export const updateFeeStructureSchema = createFeeStructureSchema.partial();

// Student Fee Assignment schemas
export const assignStudentFeeSchema = z.object({
  campusId: z.string().uuid("Invalid campus ID").optional(),
  studentId: z.string().uuid("Invalid student ID"),
  feeStructureId: z.string().uuid("Invalid fee structure ID"),
  academicYearId: z.string().uuid("Invalid academic year ID"),
  classId: z.string().uuid("Invalid class ID").optional().nullable(),
  customAmount: z.number().min(0).optional().nullable(),
});

// Discount schemas
export const createDiscountSchema = z.object({
  campusId: z.string().uuid("Invalid campus ID").optional(),
  name: z.string().min(2, "Discount name must be at least 2 characters").max(100),
  code: z.string().min(2, "Discount code must be at least 2 characters").max(20).toUpperCase(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]).default("PERCENTAGE"),
  value: z.number().min(0, "Value must be positive"),
  description: z.string().max(255).optional(),
});

export const assignStudentDiscountSchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  discountId: z.string().uuid("Invalid discount ID"),
  reason: z.string().max(255).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional().nullable(),
});

// Late Fee Rule schemas
export const createLateFeeRuleSchema = z.object({
  campusId: z.string().uuid("Invalid campus ID").optional(),
  name: z.string().min(2, "Rule name must be at least 2 characters").max(100),
  graceDays: z.number().int().min(0).default(10),
  type: z.enum(["DAILY", "FIXED_ONE_TIME", "PERCENTAGE"]).default("DAILY"),
  amount: z.number().min(0),
  maxAmount: z.number().min(0).optional().nullable(),
});

// Invoice / Challan Generation schema
export const generateInvoicesSchema = z.object({
  campusId: z.string().uuid("Invalid campus ID").optional(),
  academicYearId: z.string().uuid("Invalid academic year ID"),
  classId: z.string().uuid("Invalid class ID").optional().nullable(),
  sectionId: z.string().uuid("Invalid section ID").optional().nullable(),
  studentId: z.string().uuid("Invalid student ID").optional().nullable(),
  title: z.string().min(2, "Challan title required").max(100),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Issue date must be YYYY-MM-DD"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be YYYY-MM-DD"),
  notes: z.string().max(255).optional(),
});
