import { z } from "zod";

export const createFamilySchema = z.object({
  familyCode: z.string().min(1, "Family code is required.").max(50),
  familyName: z.string().min(1, "Family name is required.").max(150),
  primaryContactName: z.string().max(100).optional().nullable(),
  primaryContactPhone: z.string().max(20).optional().nullable(),
  primaryContactEmail: z.string().email("Invalid email address.").optional().nullable().or(z.literal("")),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
});

export const updateFamilySchema = createFamilySchema.partial();

export const linkFamilyMemberSchema = z.object({
  personId: z.string().uuid("Invalid person ID."),
  relationship: z.enum(["FATHER", "MOTHER", "GUARDIAN", "SIBLING", "OTHER"]),
  isPrimaryContact: z.boolean().default(false),
});

export const linkStudentGuardianSchema = z.object({
  studentId: z.string().uuid("Invalid student ID."),
  parentId: z.string().uuid("Invalid parent ID.").optional().nullable(),
  relationship: z.enum(["FATHER", "MOTHER", "GUARDIAN", "SPONSOR"]),
  isPrimary: z.boolean().default(false),
  canPickup: z.boolean().default(true),
});

export type CreateFamilyInput = z.infer<typeof createFamilySchema>;
export type UpdateFamilyInput = z.infer<typeof updateFamilySchema>;
export type LinkFamilyMemberInput = z.infer<typeof linkFamilyMemberSchema>;
export type LinkStudentGuardianInput = z.infer<typeof linkStudentGuardianSchema>;
