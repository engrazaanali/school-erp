import { prisma } from "@/lib/db/prisma";
import { CreateStudentInput, UpdateStudentInput } from "@/lib/validation";
import { NotFoundError, ConflictError } from "@/lib/utils/api-response";

export interface StudentListFilter {
  campusId?: string | null;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class StudentRepository {
  public static async list(organizationId: string, filter: StudentListFilter = {}) {
    const { campusId, search, status, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      deletedAt: null,
      ...(campusId ? { campusId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { admissionNumber: { contains: search, mode: "insensitive" } },
              { studentNumber: { contains: search, mode: "insensitive" } },
              { person: { firstName: { contains: search, mode: "insensitive" } } },
              { person: { lastName: { contains: search, mode: "insensitive" } } },
              { person: { email: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              nationalId: true,
              gender: true,
              dateOfBirth: true,
            },
          },
          campus: { select: { id: true, name: true, code: true } },
          studentGuardians: {
            where: { deletedAt: null },
            include: {
              parent: {
                include: {
                  person: {
                    select: { firstName: true, lastName: true, phone: true, email: true },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.student.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async findById(organizationId: string, id: string) {
    const student = await prisma.student.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      include: {
        person: true,
        campus: { select: { id: true, name: true, code: true } },
        studentGuardians: {
          where: { deletedAt: null },
          include: {
            parent: {
              include: { person: true },
            },
            family: true,
          },
        },
        admissions: {
          where: { deletedAt: null },
          orderBy: { admissionDate: "desc" },
        },
      },
    });

    if (!student) {
      throw new NotFoundError("Student record not found.");
    }

    return student;
  }

  public static async create(organizationId: string, input: CreateStudentInput) {
    const existing = await prisma.student.findFirst({
      where: {
        organizationId,
        admissionNumber: input.admissionNumber,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictError(
        `A student with admission number '${input.admissionNumber}' already exists.`
      );
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Create Person
      const person = await tx.person.create({
        data: {
          organizationId,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email || null,
          phone: input.phone || null,
          nationalId: input.nationalId || null,
          gender: input.gender || null,
          dateOfBirth: input.dateOfBirth || null,
        },
      });

      // 2. Create Student profile
      const student = await tx.student.create({
        data: {
          organizationId,
          campusId: input.campusId,
          personId: person.id,
          admissionNumber: input.admissionNumber,
          studentNumber: input.studentNumber || null,
          admissionDate: input.admissionDate || new Date(),
          status: input.status,
          bloodGroup: input.bloodGroup || null,
          emergencyContactName: input.emergencyContactName || null,
          emergencyContactPhone: input.emergencyContactPhone || null,
          medicalNotes: input.medicalNotes || null,
        },
        include: {
          person: true,
          campus: { select: { id: true, name: true, code: true } },
        },
      });

      // 3. Link Family if provided
      if (input.familyId) {
        await tx.studentGuardian.create({
          data: {
            organizationId,
            studentId: student.id,
            familyId: input.familyId,
            relationship: "GUARDIAN",
            isPrimary: true,
          },
        });
      }

      return student;
    });
  }

  public static async update(organizationId: string, id: string, input: UpdateStudentInput) {
    const student = await this.findById(organizationId, id);

    return await prisma.$transaction(async (tx) => {
      // Update Person fields if provided
      if (
        input.firstName ||
        input.lastName ||
        input.email !== undefined ||
        input.phone !== undefined ||
        input.nationalId !== undefined ||
        input.gender !== undefined ||
        input.dateOfBirth !== undefined
      ) {
        await tx.person.update({
          where: { id: student.personId },
          data: {
            ...(input.firstName ? { firstName: input.firstName } : {}),
            ...(input.lastName ? { lastName: input.lastName } : {}),
            ...(input.email !== undefined ? { email: input.email || null } : {}),
            ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
            ...(input.nationalId !== undefined ? { nationalId: input.nationalId || null } : {}),
            ...(input.gender !== undefined ? { gender: input.gender || null } : {}),
            ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth || null } : {}),
          },
        });
      }

      // Update Student fields
      return await tx.student.update({
        where: { id: student.id },
        data: {
          ...(input.admissionNumber ? { admissionNumber: input.admissionNumber } : {}),
          ...(input.studentNumber !== undefined ? { studentNumber: input.studentNumber || null } : {}),
          ...(input.admissionDate ? { admissionDate: input.admissionDate } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.bloodGroup !== undefined ? { bloodGroup: input.bloodGroup || null } : {}),
          ...(input.emergencyContactName !== undefined
            ? { emergencyContactName: input.emergencyContactName || null }
            : {}),
          ...(input.emergencyContactPhone !== undefined
            ? { emergencyContactPhone: input.emergencyContactPhone || null }
            : {}),
          ...(input.medicalNotes !== undefined ? { medicalNotes: input.medicalNotes || null } : {}),
        },
        include: {
          person: true,
          campus: { select: { id: true, name: true, code: true } },
        },
      });
    });
  }

  public static async softDelete(organizationId: string, id: string) {
    const student = await this.findById(organizationId, id);

    return await prisma.student.update({
      where: { id: student.id },
      data: { deletedAt: new Date() },
    });
  }
}
