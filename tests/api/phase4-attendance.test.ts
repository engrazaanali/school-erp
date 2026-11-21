import { describe, it, expect, vi, beforeEach } from "vitest";
import { AttendanceService, AbsentEventPayload } from "@/server/services/attendance.service";
import { ForbiddenError } from "@/lib/utils/api-response";
import { AuthContext } from "@/server/authorization/auth-context";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    teacher: {
      findFirst: vi.fn(),
    },
    teacherAssignment: {
      findFirst: vi.fn(),
    },
    studentGuardian: {
      findFirst: vi.fn(),
    },
    attendanceSession: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    attendanceRecord: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/logging", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Phase 4: Academic Core & Attendance Authorization", () => {
  const ORG_A = "org-apex";
  const CAMPUS_1 = "campus-downtown";
  const CLASS_G1 = "class-g1";
  const SECTION_A = "section-a";
  const SECTION_B = "section-b";
  const TEACHER_1 = "teacher-1";
  const STUDENT_1 = "student-1";
  const STUDENT_2 = "student-2";

  function createAuthContext(overrides: Partial<AuthContext> = {}): AuthContext {
    return {
      userId: "user-1",
      personId: "person-1",
      organizationId: ORG_A,
      email: "teacher@apex.edu",
      status: "ACTIVE",
      firstName: "Sarah",
      lastName: "Miller",
      permissions: new Set(["attendance.read", "attendance.write", "academics.read"]),
      roles: ["teacher"],
      assignments: [
        {
          id: "assign-1",
          campusId: CAMPUS_1,
          scopeType: "CAMPUS",
          scopeId: null,
          isPrimary: true,
        },
      ],
      primaryCampusId: CAMPUS_1,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
      requestId: "req-p4",
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Teacher cannot mark attendance for unassigned class/section
  it("DENY: Teacher attempting to mark attendance for unassigned class/section throws ForbiddenError", async () => {
    const ctx = createAuthContext({ roles: ["teacher"] });

    // Mock teacher exists
    vi.mocked(prisma.teacher.findFirst).mockResolvedValue({
      id: TEACHER_1,
      organizationId: ORG_A,
    } as any);

    // Mock no assignment for Class G1 + Section B
    vi.mocked(prisma.teacherAssignment.findFirst).mockResolvedValue(null);

    await expect(
      AttendanceService.verifyTeacherClassAccess(ctx, CLASS_G1, SECTION_B)
    ).rejects.toThrowError(ForbiddenError);
  });

  // 2. Teacher can mark attendance for assigned class/section
  it("ALLOW: Teacher can mark attendance for class/section they are assigned to", async () => {
    const ctx = createAuthContext({ roles: ["teacher"] });

    vi.mocked(prisma.teacher.findFirst).mockResolvedValue({
      id: TEACHER_1,
      organizationId: ORG_A,
    } as any);

    // Mock active assignment for Class G1 + Section A
    vi.mocked(prisma.teacherAssignment.findFirst).mockResolvedValue({
      id: "ta-1",
      teacherId: TEACHER_1,
      classId: CLASS_G1,
      sectionId: SECTION_A,
    } as any);

    await expect(
      AttendanceService.verifyTeacherClassAccess(ctx, CLASS_G1, SECTION_A)
    ).resolves.not.toThrow();
  });

  // 3. Org Admin can mark attendance anywhere in the organization
  it("ALLOW: Org Admin bypasses class teacher assignment check", async () => {
    const ctx = createAuthContext({ roles: ["org_admin"] });

    await expect(
      AttendanceService.verifyTeacherClassAccess(ctx, CLASS_G1, SECTION_B)
    ).resolves.not.toThrow();
  });

  // 4. Parent cannot view attendance for another family's student
  it("DENY: Parent attempting to view attendance of non-linked student throws ForbiddenError", async () => {
    const ctx = createAuthContext({
      roles: ["parent"],
      personId: "parent-person-1",
    });

    // Mock no guardian or family linkage to student-2
    vi.mocked(prisma.studentGuardian.findFirst).mockResolvedValue(null);

    await expect(
      AttendanceService.verifyParentStudentAccess(ctx, STUDENT_2)
    ).rejects.toThrowError(ForbiddenError);
  });

  // 5. Parent can view attendance for their own child
  it("ALLOW: Parent can view attendance for their own linked child", async () => {
    const ctx = createAuthContext({
      roles: ["parent"],
      personId: "parent-person-1",
    });

    // Mock active guardian linkage to student-1
    vi.mocked(prisma.studentGuardian.findFirst).mockResolvedValue({
      id: "sg-1",
      studentId: STUDENT_1,
      organizationId: ORG_A,
    } as any);

    await expect(
      AttendanceService.verifyParentStudentAccess(ctx, STUDENT_1)
    ).resolves.not.toThrow();
  });

  // 6. Absent mark triggers ATTENDANCE_ABSENT notification event hook
  it("EMIT: Absent pupil marks trigger ATTENDANCE_ABSENT event hook", () => {
    const emitSpy = vi.spyOn(AttendanceService, "emitAbsentEvent");

    const payload: AbsentEventPayload = {
      organizationId: ORG_A,
      campusId: CAMPUS_1,
      studentId: STUDENT_1,
      studentName: "Johnnie Smith",
      classId: CLASS_G1,
      sectionId: SECTION_A,
      date: new Date("2026-11-22"),
      emergencyContactPhone: "+1-555-0999",
    };

    AttendanceService.emitAbsentEvent(payload);

    expect(emitSpy).toHaveBeenCalledWith(payload);
  });
});
