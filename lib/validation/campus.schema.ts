import { z } from "zod";

export const createCampusSchema = z.object({
  name: z.string().min(2, "Campus name must have at least 2 characters").max(100),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, "Campus code must contain uppercase alphanumeric characters"),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable(),
  settings: z
    .object({
      academicStartMonth: z.number().int().min(1).max(12).default(1),
      workingDays: z.string().default("MON,TUE,WED,THU,FRI"),
    })
    .optional(),
});

export const updateCampusSchema = createCampusSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type CreateCampusInput = z.infer<typeof createCampusSchema>;
export type UpdateCampusInput = z.infer<typeof updateCampusSchema>;
