import { prisma } from "@/lib/db/prisma";
import { CreateStaffInput, UpdateStaffInput } from "@/lib/validation";
import { NotFoundError, ConflictError } from "@/lib/utils/api-response";

export interface StaffListFilter {
  campusId?: string | null;
  search?: string;
  status?: string;
  department?: string;
  page?: number;
  limit?: number;
}

export class StaffRepository {
  public static async list(organizationId: string, filter: StaffListFilter = {}) {
    const { campusId, search, status, department, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      deletedAt: null,
      ...(campusId ? { campusId } : {}),
      ...(status ? { status } : {}),
      ...(department ? { department } : {}),
      ...(search
        ? {
            OR: [
              { employeeNumber: { contains: search, mode: "insensitive" } },
              { designation: { contains: search, mode: "insensitive" } },
              { department: { contains: search, mode: "insensitive" } },
              { person: { firstName: { contains: search, mode: "insensitive" } } },
              { person: { lastName: { contains: search, mode: "insensitive" } } },
              { person: { email: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.staff.findMany({
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
          teacher: true,
        },
      }),
      prisma.staff.count({ where }),
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
    const staff = await prisma.staff.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      include: {
        person: true,
        campus: { select: { id: true, name: true, code: true } },
        teacher: true,
      },
    });

    if (!staff) {
      throw new NotFoundError("Staff record not found.");
    }

    return staff;
  }

  public static async create(organizationId: string, input: CreateStaffInput) {
    const existing = await prisma.staff.findFirst({
      where: {
        organizationId,
        employeeNumber: input.employeeNumber,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictError(
        `Staff with employee number '${input.employeeNumber}' already exists.`
      );
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Create Person
      const person = await tx.person.create({
        data: {
          organizationId,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone || null,
          nationalId: input.nationalId || null,
          gender: input.gender || null,
          dateOfBirth: input.dateOfBirth || null,
        },
      });

      // 2. Create Staff profile
      const staff = await tx.staff.create({
        data: {
          organizationId,
          campusId: input.campusId,
          personId: person.id,
          employeeNumber: input.employeeNumber,
          designation: input.designation,
          department: input.department || null,
          joiningDate: input.joiningDate || new Date(),
          status: input.status,
          employmentType: input.employmentType,
        },
        include: {
          person: true,
          campus: { select: { id: true, name: true, code: true } },
        },
      });

      // 3. Create Teacher profile if requested
      if (input.isTeacher) {
        await tx.teacher.create({
          data: {
            organizationId,
            campusId: input.campusId,
            staffId: staff.id,
            specialization: input.specialization || null,
            qualification: input.qualification || null,
          },
        });
      }

      return staff;
    });
  }

  public static async update(organizationId: string, id: string, input: UpdateStaffInput) {
    const staff = await this.findById(organizationId, id);

    return await prisma.$transaction(async (tx) => {
      // Update Person
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
          where: { id: staff.personId },
          data: {
            ...(input.firstName ? { firstName: input.firstName } : {}),
            ...(input.lastName ? { lastName: input.lastName } : {}),
            ...(input.email ? { email: input.email } : {}),
            ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
            ...(input.nationalId !== undefined ? { nationalId: input.nationalId || null } : {}),
            ...(input.gender !== undefined ? { gender: input.gender || null } : {}),
            ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth || null } : {}),
          },
        });
      }

      // Update Staff
      const updatedStaff = await tx.staff.update({
        where: { id: staff.id },
        data: {
          ...(input.employeeNumber ? { employeeNumber: input.employeeNumber } : {}),
          ...(input.designation ? { designation: input.designation } : {}),
          ...(input.department !== undefined ? { department: input.department || null } : {}),
          ...(input.joiningDate ? { joiningDate: input.joiningDate } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.employmentType ? { employmentType: input.employmentType } : {}),
        },
        include: {
          person: true,
          campus: { select: { id: true, name: true, code: true } },
          teacher: true,
        },
      });

      // Update/Create Teacher profile if isTeacher toggle changed
      if (input.isTeacher !== undefined) {
        if (input.isTeacher) {
          await tx.teacher.upsert({
            where: { staffId: staff.id },
            update: {
              specialization: input.specialization || null,
              qualification: input.qualification || null,
              deletedAt: null,
            },
            create: {
              organizationId,
              campusId: staff.campusId,
              staffId: staff.id,
              specialization: input.specialization || null,
              qualification: input.qualification || null,
            },
          });
        } else if (staff.teacher) {
          await tx.teacher.update({
            where: { staffId: staff.id },
            data: { deletedAt: new Date() },
          });
        }
      }

      return updatedStaff;
    });
  }

  public static async softDelete(organizationId: string, id: string) {
    const staff = await this.findById(organizationId, id);

    return await prisma.staff.update({
      where: { id: staff.id },
      data: { deletedAt: new Date() },
    });
  }
}
