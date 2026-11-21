import { prisma } from "@/lib/db/prisma";
import {
  CreateAcademicYearInput,
  UpdateAcademicYearInput,
  CreateClassInput,
  UpdateClassInput,
  CreateSectionInput,
  UpdateSectionInput,
  CreateSubjectInput,
  UpdateSubjectInput,
  CreateTeacherAssignmentInput,
  CreateStudentEnrollmentInput,
} from "@/lib/validation";
import { NotFoundError, ConflictError } from "@/lib/utils/api-response";

export class AcademicRepository {
  // ─── Academic Years ────────────────────────────────────────────────────────
  public static async listAcademicYears(organizationId: string, campusId?: string) {
    return prisma.academicYear.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(campusId ? { campusId } : {}),
      },
      orderBy: { startDate: "desc" },
      include: {
        campus: { select: { id: true, name: true, code: true } },
        _count: { select: { studentEnrollments: true, teacherAssignments: true } },
      },
    });
  }

  public static async createAcademicYear(organizationId: string, input: CreateAcademicYearInput) {
    const existing = await prisma.academicYear.findFirst({
      where: { campusId: input.campusId, code: input.code, deletedAt: null },
    });
    if (existing) {
      throw new ConflictError(`Academic Year with code '${input.code}' already exists in this campus.`);
    }

    return prisma.$transaction(async (tx) => {
      if (input.isCurrent) {
        await tx.academicYear.updateMany({
          where: { campusId: input.campusId, isCurrent: true },
          data: { isCurrent: false },
        });
      }

      return tx.academicYear.create({
        data: {
          organizationId,
          campusId: input.campusId,
          name: input.name,
          code: input.code,
          startDate: input.startDate,
          endDate: input.endDate,
          isCurrent: input.isCurrent,
          status: input.status,
        },
        include: {
          campus: { select: { id: true, name: true, code: true } },
        },
      });
    });
  }

  // ─── Classes & Sections ───────────────────────────────────────────────────
  public static async listClasses(organizationId: string, campusId?: string) {
    return prisma.class.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(campusId ? { campusId } : {}),
      },
      orderBy: [{ campus: { name: "asc" } }, { order: "asc" }],
      include: {
        campus: { select: { id: true, name: true, code: true } },
        sections: { where: { deletedAt: null }, orderBy: { name: "asc" } },
        classSubjects: {
          where: { deletedAt: null },
          include: { subject: true },
        },
        _count: { select: { studentEnrollments: true } },
      },
    });
  }

  public static async createClass(organizationId: string, input: CreateClassInput) {
    const existing = await prisma.class.findFirst({
      where: { campusId: input.campusId, code: input.code, deletedAt: null },
    });
    if (existing) {
      throw new ConflictError(`Class with code '${input.code}' already exists in this campus.`);
    }

    return prisma.class.create({
      data: {
        organizationId,
        campusId: input.campusId,
        name: input.name,
        code: input.code,
        stage: input.stage || null,
        order: input.order,
      },
      include: {
        campus: { select: { id: true, name: true, code: true } },
        sections: true,
      },
    });
  }

  public static async createSection(organizationId: string, input: CreateSectionInput) {
    const parentClass = await prisma.class.findFirst({
      where: { id: input.classId, organizationId, deletedAt: null },
    });
    if (!parentClass) {
      throw new NotFoundError("Target Class not found.");
    }

    const existing = await prisma.section.findFirst({
      where: { classId: input.classId, code: input.code, deletedAt: null },
    });
    if (existing) {
      throw new ConflictError(`Section with code '${input.code}' already exists in this class.`);
    }

    return prisma.section.create({
      data: {
        organizationId,
        campusId: input.campusId,
        classId: input.classId,
        name: input.name,
        code: input.code,
        capacity: input.capacity,
      },
      include: {
        class: { select: { id: true, name: true } },
      },
    });
  }

  // ─── Subjects ─────────────────────────────────────────────────────────────
  public static async listSubjects(organizationId: string, campusId?: string) {
    return prisma.subject.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(campusId ? { campusId } : {}),
      },
      orderBy: { name: "asc" },
      include: {
        campus: { select: { id: true, name: true, code: true } },
      },
    });
  }

  public static async createSubject(organizationId: string, input: CreateSubjectInput) {
    const existing = await prisma.subject.findFirst({
      where: { campusId: input.campusId, code: input.code, deletedAt: null },
    });
    if (existing) {
      throw new ConflictError(`Subject with code '${input.code}' already exists in this campus.`);
    }

    return prisma.subject.create({
      data: {
        organizationId,
        campusId: input.campusId,
        name: input.name,
        code: input.code,
        type: input.type,
        creditHours: input.creditHours ? Number(input.creditHours) : null,
      },
      include: {
        campus: { select: { id: true, name: true, code: true } },
      },
    });
  }

  // ─── Teacher Assignments ──────────────────────────────────────────────────
  public static async listTeacherAssignments(organizationId: string, params: { campusId?: string; classId?: string; sectionId?: string; teacherId?: string }) {
    const { campusId, classId, sectionId, teacherId } = params;
    return prisma.teacherAssignment.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(campusId ? { campusId } : {}),
        ...(classId ? { classId } : {}),
        ...(sectionId ? { sectionId } : {}),
        ...(teacherId ? { teacherId } : {}),
      },
      include: {
        academicYear: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        teacher: {
          include: {
            staff: {
              include: {
                person: { select: { firstName: true, lastName: true, email: true } },
              },
            },
          },
        },
      },
    });
  }

  public static async createTeacherAssignment(organizationId: string, input: CreateTeacherAssignmentInput) {
    return prisma.teacherAssignment.create({
      data: {
        organizationId,
        campusId: input.campusId,
        academicYearId: input.academicYearId,
        classId: input.classId,
        sectionId: input.sectionId,
        teacherId: input.teacherId,
        subjectId: input.subjectId || null,
        isClassTeacher: input.isClassTeacher,
      },
      include: {
        class: { select: { name: true } },
        section: { select: { name: true } },
        subject: { select: { name: true } },
        teacher: {
          include: {
            staff: {
              include: {
                person: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });
  }

  // ─── Student Enrollments ──────────────────────────────────────────────────
  public static async listEnrollments(organizationId: string, params: { campusId?: string; classId?: string; sectionId?: string; academicYearId?: string }) {
    const { campusId, classId, sectionId, academicYearId } = params;
    return prisma.studentEnrollment.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(campusId ? { campusId } : {}),
        ...(classId ? { classId } : {}),
        ...(sectionId ? { sectionId } : {}),
        ...(academicYearId ? { academicYearId } : {}),
      },
      orderBy: { rollNumber: "asc" },
      include: {
        student: {
          include: {
            person: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        class: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
      },
    });
  }

  public static async enrollStudent(organizationId: string, input: CreateStudentEnrollmentInput) {
    // Check if student already enrolled in this academic year
    const existing = await prisma.studentEnrollment.findFirst({
      where: {
        academicYearId: input.academicYearId,
        studentId: input.studentId,
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictError("Student is already enrolled in this Academic Year.");
    }

    return prisma.studentEnrollment.create({
      data: {
        organizationId,
        campusId: input.campusId,
        academicYearId: input.academicYearId,
        studentId: input.studentId,
        classId: input.classId,
        sectionId: input.sectionId,
        rollNumber: input.rollNumber || null,
        status: input.status,
      },
      include: {
        student: {
          include: {
            person: { select: { firstName: true, lastName: true } },
          },
        },
        class: { select: { name: true } },
        section: { select: { name: true } },
      },
    });
  }
}
