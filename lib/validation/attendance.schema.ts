import { z } from "zod";

export const attendanceRecordItemSchema = z.object({
  studentId: z.string().uuid("Invalid student ID."),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "LEAVE"]),
  remarks: z.string().max(255).optional().nullable(),
});

export const markAttendanceSchema = z.object({
  campusId: z.string().uuid("Invalid campus ID."),
  academicYearId: z.string().uuid("Invalid academic year ID."),
  classId: z.string().uuid("Invalid class ID."),
  sectionId: z.string().uuid("Invalid section ID."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.").transform((v) => new Date(v)),
  records: z.array(attendanceRecordItemSchema).min(1, "At least one attendance record is required."),
});

export const createLeaveRequestSchema = z.object({
  campusId: z.string().uuid("Invalid campus ID."),
  studentId: z.string().uuid("Invalid student ID."),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((v) => new Date(v)),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((v) => new Date(v)),
  reason: z.string().min(1, "Reason is required.").max(500),
});

export const updateLeaveRequestStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type AttendanceRecordItem = z.infer<typeof attendanceRecordItemSchema>;
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type UpdateLeaveRequestStatusInput = z.infer<typeof updateLeaveRequestStatusSchema>;
