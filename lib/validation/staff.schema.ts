import { z } from "zod";

export const createStaffSchema = z.object({
  campusId: z.string().uuid("Invalid campus ID."),
  firstName: z.string().min(1, "First name is required.").max(100),
  lastName: z.string().min(1, "Last name is required.").max(100),
  email: z.string().email("Invalid email address."),
  phone: z.string().max(20).optional().nullable(),
  nationalId: z.string().max(50).optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  dateOfBirth: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).transform((val) => val ? new Date(val) : null),
  employeeNumber: z.string().min(1, "Employee number is required.").max(50),
  designation: z.string().min(1, "Designation is required.").max(100),
  department: z.string().max(100).optional().nullable(),
  joiningDate: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).transform((val) => val ? new Date(val) : new Date()),
  status: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED", "RESIGNED"]).default("ACTIVE"),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT"]).default("FULL_TIME"),
  isTeacher: z.boolean().default(false),
  specialization: z.string().max(100).optional().nullable(),
  qualification: z.string().max(200).optional().nullable(),
  roleSlug: z.string().min(1, "Role slug is required.").default("staff"),
});

export const updateStaffSchema = createStaffSchema.partial().omit({ campusId: true });

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
