import { z } from "zod";

export const createStudentSchema = z.object({
  campusId: z.string().uuid("Invalid campus ID."),
  firstName: z.string().min(1, "First name is required.").max(100),
  lastName: z.string().min(1, "Last name is required.").max(100),
  email: z.string().email("Invalid email address.").optional().nullable().or(z.literal("")),
  phone: z.string().max(20).optional().nullable(),
  nationalId: z.string().max(50).optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  dateOfBirth: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).transform((val) => val ? new Date(val) : null),
  admissionNumber: z.string().min(1, "Admission number is required.").max(50),
  studentNumber: z.string().max(50).optional().nullable(),
  admissionDate: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).transform((val) => val ? new Date(val) : new Date()),
  status: z.enum(["ACTIVE", "GRADUATED", "WITHDRAWN", "SUSPENDED"]).default("ACTIVE"),
  bloodGroup: z.string().max(10).optional().nullable(),
  emergencyContactName: z.string().max(100).optional().nullable(),
  emergencyContactPhone: z.string().max(20).optional().nullable(),
  medicalNotes: z.string().max(1000).optional().nullable(),
  familyId: z.string().uuid().optional().nullable(),
});

export const updateStudentSchema = createStudentSchema.partial().omit({ campusId: true });

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
