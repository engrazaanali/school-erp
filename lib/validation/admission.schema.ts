import { z } from "zod";

export const createAdmissionInquirySchema = z.object({
  campusId: z.string().uuid("Invalid campus ID."),
  studentFirstName: z.string().min(1, "Student first name is required.").max(100),
  studentLastName: z.string().min(1, "Student last name is required.").max(100),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  dateOfBirth: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).transform((val) => val ? new Date(val) : null),
  gradeApplying: z.string().min(1, "Grade applying for is required.").max(50),
  parentName: z.string().min(1, "Parent/Guardian name is required.").max(100),
  parentPhone: z.string().min(1, "Parent phone number is required.").max(20),
  parentEmail: z.string().email("Invalid parent email address.").optional().nullable().or(z.literal("")),
  source: z.enum(["WEBSITE", "REFERRAL", "WALK_IN", "SOCIAL_MEDIA", "OTHER"]).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateAdmissionInquirySchema = createAdmissionInquirySchema.partial().omit({ campusId: true }).extend({
  status: z.enum(["INQUIRY", "CONTACTED", "TEST_SCHEDULED", "OFFERED", "ADMITTED", "REJECTED", "CANCELLED"]).optional(),
});

export const createAdmissionFollowupSchema = z.object({
  inquiryId: z.string().uuid("Invalid inquiry ID."),
  contactType: z.enum(["PHONE_CALL", "EMAIL", "MEETING", "WHATSAPP"]),
  responseNotes: z.string().min(1, "Notes are required.").max(1000),
  nextFollowupDate: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).transform((val) => val ? new Date(val) : null),
  performedBy: z.string().optional().nullable(),
});

export const convertInquiryToAdmissionSchema = z.object({
  inquiryId: z.string().uuid("Invalid inquiry ID."),
  gradeEnrolled: z.string().min(1, "Grade enrolled is required.").max(50),
  academicYear: z.string().min(1, "Academic year is required.").max(20), // e.g. "2026-2027"
  admissionNumber: z.string().min(1, "Admission number is required.").max(50),
  admissionDate: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).transform((val) => val ? new Date(val) : new Date()),
  notes: z.string().max(1000).optional().nullable(),
});

export type CreateAdmissionInquiryInput = z.infer<typeof createAdmissionInquirySchema>;
export type UpdateAdmissionInquiryInput = z.infer<typeof updateAdmissionInquirySchema>;
export type CreateAdmissionFollowupInput = z.infer<typeof createAdmissionFollowupSchema>;
export type ConvertInquiryToAdmissionInput = z.infer<typeof convertInquiryToAdmissionSchema>;
