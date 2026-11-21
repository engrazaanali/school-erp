import { prisma } from "@/lib/db/prisma";
import { AttendanceRepository } from "@/server/repositories/attendance.repository";
import { MarkAttendanceInput } from "@/lib/validation";
import { ForbiddenError, NotFoundError } from "@/lib/utils/api-response";
import { logger } from "@/lib/logging";
import { AuthContext } from "@/server/authorization/auth-context";

export interface AbsentEventPayload {
  organizationId: string;
  campusId: string;
  studentId: string;
  studentName: string;
  classId: string;
  sectionId: string;
  date: Date;
  emergencyContactPhone?: string | null;
}

export class AttendanceService {
  /**
   * Verifies that the authenticated teacher has an active assignment to mark
   * attendance for this Class & Section. Org Admins bypass this check.
   */
  public static async verifyTeacherClassAccess(
    ctx: AuthContext,
    classId: string,
    sectionId: string
  ): Promise<void> {
    if (ctx.roles.includes("org_admin") || ctx.roles.includes("platform_super_admin")) {
      return;
    }

    // Verify teacher profile exists for this person
    const teacher = await prisma.teacher.findFirst({
      where: {
        organizationId: ctx.organizationId,
        staff: {
          personId: ctx.personId,
          deletedAt: null,
        },
        deletedAt: null,
      },
    });

    if (!teacher) {
      throw new ForbiddenError("Teacher profile not found for this user account.");
    }

    // Verify assignment to this class and section
    const assignment = await prisma.teacherAssignment.findFirst({
      where: {
        organizationId: ctx.organizationId,
        teacherId: teacher.id,
        classId,
        sectionId,
        deletedAt: null,
      },
    });

    if (!assignment) {
      logger.warn("Teacher attempted to mark attendance for unassigned class/section", {
        userId: ctx.userId,
        classId,
        sectionId,
      });
      throw new ForbiddenError(
        "Access denied. You are not assigned as a teacher for this class and section."
      );
    }
  }

  /**
   * Verifies that a parent/guardian has authorized access to view their own child's attendance.
   */
  public static async verifyParentStudentAccess(
    ctx: AuthContext,
    studentId: string
  ): Promise<void> {
    if (
      ctx.roles.includes("org_admin") ||
      ctx.roles.includes("platform_super_admin") ||
      ctx.roles.includes("principal") ||
      ctx.roles.includes("teacher")
    ) {
      return;
    }

    // Check student guardian linkage via Person ID
    const guardianLink = await prisma.studentGuardian.findFirst({
      where: {
        organizationId: ctx.organizationId,
        studentId,
        deletedAt: null,
        OR: [
          { parent: { personId: ctx.personId } },
          { family: { familyMembers: { some: { personId: ctx.personId, deletedAt: null } } } },
        ],
      },
    });

    if (!guardianLink) {
      logger.warn("Parent attempted to access attendance of unlinked student", {
        userId: ctx.userId,
        targetStudentId: studentId,
      });
      throw new ForbiddenError("Access denied. You are not registered as a guardian for this student.");
    }
  }

  /**
   * Submits daily attendance and emits `ATTENDANCE_ABSENT` notification events.
   */
  public static async submitAttendance(ctx: AuthContext, input: MarkAttendanceInput) {
    // 1. Authorize teacher for this class/section
    await this.verifyTeacherClassAccess(ctx, input.classId, input.sectionId);

    // 2. Save session & records
    const result = await AttendanceRepository.markAttendance(ctx.organizationId, ctx.userId, input);

    // 3. Emit `ATTENDANCE_ABSENT` events for absent pupils (hook ready for WhatsApp/notification queue)
    const absentRecords = result.records.filter((r) => r.status === "ABSENT");

    for (const record of absentRecords) {
      const payload: AbsentEventPayload = {
        organizationId: ctx.organizationId,
        campusId: input.campusId,
        studentId: record.studentId,
        studentName: `${record.student.person.firstName} ${record.student.person.lastName}`,
        classId: input.classId,
        sectionId: input.sectionId,
        date: input.date,
        emergencyContactPhone: record.student.emergencyContactPhone,
      };

      // Dispatched event ready for WhatsApp receipt/notification queue
      this.emitAbsentEvent(payload);
    }

    return result;
  }

  /**
   * Event dispatcher for absent student notifications.
   */
  public static emitAbsentEvent(payload: AbsentEventPayload) {
    logger.info("EVENT: ATTENDANCE_ABSENT emitted", {
      event: "ATTENDANCE_ABSENT",
      studentId: payload.studentId,
      studentName: payload.studentName,
      date: payload.date.toISOString().split("T")[0],
      phone: payload.emergencyContactPhone || "No Phone",
      organizationId: payload.organizationId,
    });
  }
}
