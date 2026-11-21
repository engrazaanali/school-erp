import { z } from "zod";

export const createAcademicYearSchema = z.object({
  campusId: z.string().uuid("Invalid campus ID."),
  name: z.string().min(1, "Name is required.").max(50), // e.g. "2026-2027"
  code: z.string().min(1, "Code is required.").max(20), // e.g. "AY-26-27"
  startDate: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).transform((val) => val ? new Date(val) : new Date()),
  endDate: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).transform((val) => val ? new Date(val) : new Date()),
  isCurrent: z.boolean().default(false),
  status: z.enum(["ACTIVE", "CLOSED", "PLANNED"]).default("ACTIVE"),
});

export const updateAcademicYearSchema = createAcademicYearSchema.partial().omit({ campusId: true });

export const createClassSchema = z.object({
  campusId: z.string().uuid("Invalid campus ID."),
  name: z.string().min(1, "Class name is required.").max(50), // e.g. "Grade 1"
  code: z.string().min(1, "Class code is required.").max(20), // e.g. "G1"
  stage: z.enum(["PRIMARY", "MIDDLE", "SECONDARY", "HIGHER_SECONDARY"]).optional().nullable(),
  order: z.number().int().default(1),
});

export const updateClassSchema = createClassSchema.partial().omit({ campusId: true });

export const createSectionSchema = z.object({
  campusId: z.string().uuid("Invalid campus ID."),
  classId: z.string().uuid("Invalid class ID."),
  name: z.string().min(1, "Section name is required.").max(50), // e.g. "Section A"
  code: z.string().min(1, "Section code is required.").max(20), // e.g. "A"
  capacity: z.number().int().min(1).max(100).default(30),
});

export const updateSectionSchema = createSectionSchema.partial().omit({ campusId: true, classId: true });

export const createSubjectSchema = z.object({
  campusId: z.string().uuid("Invalid campus ID."),
  name: z.string().min(1, "Subject name is required.").max(100),
  code: z.string().min(1, "Subject code is required.").max(20),
  type: z.enum(["THEORY", "PRACTICAL", "BOTH"]).default("THEORY"),
  creditHours: z.number().min(0).max(10).optional().nullable(),
});

export const updateSubjectSchema = createSubjectSchema.partial().omit({ campusId: true });

export const createTeacherAssignmentSchema = z.object({
  campusId: z.string().uuid("Invalid campus ID."),
  academicYearId: z.string().uuid("Invalid academic year ID."),
  classId: z.string().uuid("Invalid class ID."),
  sectionId: z.string().uuid("Invalid section ID."),
  teacherId: z.string().uuid("Invalid teacher ID."),
  subjectId: z.string().uuid("Invalid subject ID.").optional().nullable(),
  isClassTeacher: z.boolean().default(false),
});

export const createStudentEnrollmentSchema = z.object({
  campusId: z.string().uuid("Invalid campus ID."),
  academicYearId: z.string().uuid("Invalid academic year ID."),
  studentId: z.string().uuid("Invalid student ID."),
  classId: z.string().uuid("Invalid class ID."),
  sectionId: z.string().uuid("Invalid section ID."),
  rollNumber: z.string().max(20).optional().nullable(),
  status: z.enum(["ACTIVE", "PROMOTED", "REPEATING", "TRANSFERRED", "DROPPED"]).default("ACTIVE"),
});

export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;
export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearSchema>;
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
export type CreateTeacherAssignmentInput = z.infer<typeof createTeacherAssignmentSchema>;
export type CreateStudentEnrollmentInput = z.infer<typeof createStudentEnrollmentSchema>;
