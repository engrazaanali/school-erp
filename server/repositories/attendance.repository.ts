import { prisma } from "@/lib/db/prisma";
import { MarkAttendanceInput, CreateLeaveRequestInput } from "@/lib/validation";
import { NotFoundError } from "@/lib/utils/api-response";

export class AttendanceRepository {
  public static async findSession(params: {
    organizationId: string;
    classId: string;
    sectionId: string;
    date: Date;
  }) {
    const { organizationId, classId, sectionId, date } = params;
    return prisma.attendanceSession.findFirst({
      where: {
        organizationId,
        classId,
        sectionId,
        date,
      },
      include: {
        takenBy: {
          include: {
            person: { select: { firstName: true, lastName: true } },
          },
        },
        records: {
          include: {
            student: {
              include: {
                person: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });
  }

  public static async markAttendance(
    organizationId: string,
    takenById: string,
    input: MarkAttendanceInput
  ) {
    const { campusId, academicYearId, classId, sectionId, date, records } = input;

    return prisma.$transaction(async (tx) => {
      // 1. Upsert AttendanceSession
      const session = await tx.attendanceSession.upsert({
        where: {
          classId_sectionId_date: {
            classId,
            sectionId,
            date,
          },
        },
        update: {
          takenById,
          status: "SUBMITTED",
        },
        create: {
          organizationId,
          campusId,
          academicYearId,
          classId,
          sectionId,
          date,
          takenById,
          status: "SUBMITTED",
        },
      });

      // 2. Upsert each student record
      const savedRecords = [];
      for (const record of records) {
        const saved = await tx.attendanceRecord.upsert({
          where: {
            sessionId_studentId: {
              sessionId: session.id,
              studentId: record.studentId,
            },
          },
          update: {
            status: record.status,
            remarks: record.remarks || null,
          },
          create: {
            organizationId,
            sessionId: session.id,
            studentId: record.studentId,
            status: record.status,
            remarks: record.remarks || null,
          },
          include: {
            student: {
              include: {
                person: { select: { firstName: true, lastName: true } },
              },
            },
          },
        });
        savedRecords.push(saved);
      }

      return {
        session,
        records: savedRecords,
      };
    });
  }

  public static async listStudentAttendance(organizationId: string, studentId: string, params: { startDate?: Date; endDate?: Date } = {}) {
    const { startDate, endDate } = params;

    return prisma.attendanceRecord.findMany({
      where: {
        organizationId,
        studentId,
        ...(startDate || endDate
          ? {
              session: {
                date: {
                  ...(startDate ? { gte: startDate } : {}),
                  ...(endDate ? { lte: endDate } : {}),
                },
              },
            }
          : {}),
      },
      orderBy: { session: { date: "desc" } },
      include: {
        session: {
          select: {
            id: true,
            date: true,
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
      },
    });
  }

  // ─── Leave Requests ────────────────────────────────────────────────────────
  public static async createLeaveRequest(organizationId: string, input: CreateLeaveRequestInput) {
    return prisma.leaveRequest.create({
      data: {
        organizationId,
        campusId: input.campusId,
        studentId: input.studentId,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
        status: "PENDING",
      },
      include: {
        student: {
          include: {
            person: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  public static async listLeaveRequests(organizationId: string, campusId?: string, studentId?: string) {
    return prisma.leaveRequest.findMany({
      where: {
        organizationId,
        ...(campusId ? { campusId } : {}),
        ...(studentId ? { studentId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        student: {
          include: {
            person: { select: { firstName: true, lastName: true } },
            campus: { select: { name: true } },
          },
        },
        approvedBy: {
          include: {
            person: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  public static async updateLeaveRequestStatus(
    organizationId: string,
    id: string,
    status: "APPROVED" | "REJECTED",
    approvedById: string
  ) {
    const request = await prisma.leaveRequest.findFirst({
      where: { id, organizationId },
    });
    if (!request) {
      throw new NotFoundError("Leave request not found.");
    }

    return prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        approvedById,
      },
    });
  }
}
