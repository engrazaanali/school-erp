import { prisma } from "@/lib/db/prisma";
import { CreateFamilyInput, UpdateFamilyInput, LinkFamilyMemberInput, LinkStudentGuardianInput } from "@/lib/validation";
import { NotFoundError, ConflictError } from "@/lib/utils/api-response";

export interface FamilyListFilter {
  search?: string;
  page?: number;
  limit?: number;
}

export class FamilyRepository {
  public static async list(organizationId: string, filter: FamilyListFilter = {}) {
    const { search, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { familyCode: { contains: search, mode: "insensitive" } },
              { familyName: { contains: search, mode: "insensitive" } },
              { primaryContactName: { contains: search, mode: "insensitive" } },
              { primaryContactPhone: { contains: search, mode: "insensitive" } },
              { primaryContactEmail: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.family.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          familyMembers: {
            where: { deletedAt: null },
            include: {
              person: {
                select: { id: true, firstName: true, lastName: true, phone: true, email: true },
              },
            },
          },
          studentGuardians: {
            where: { deletedAt: null },
            include: {
              student: {
                include: {
                  person: { select: { id: true, firstName: true, lastName: true } },
                  campus: { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
        },
      }),
      prisma.family.count({ where }),
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
    const family = await prisma.family.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      include: {
        familyMembers: {
          where: { deletedAt: null },
          include: {
            person: true,
          },
        },
        studentGuardians: {
          where: { deletedAt: null },
          include: {
            student: {
              include: {
                person: true,
                campus: { select: { id: true, name: true, code: true } },
              },
            },
            parent: {
              include: { person: true },
            },
          },
        },
      },
    });

    if (!family) {
      throw new NotFoundError("Family record not found.");
    }

    return family;
  }

  public static async create(organizationId: string, input: CreateFamilyInput) {
    const existing = await prisma.family.findFirst({
      where: {
        organizationId,
        familyCode: input.familyCode,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictError(`Family with code '${input.familyCode}' already exists.`);
    }

    return await prisma.family.create({
      data: {
        organizationId,
        familyCode: input.familyCode,
        familyName: input.familyName,
        primaryContactName: input.primaryContactName || null,
        primaryContactPhone: input.primaryContactPhone || null,
        primaryContactEmail: input.primaryContactEmail || null,
        address: input.address || null,
        city: input.city || null,
      },
      include: {
        familyMembers: true,
        studentGuardians: true,
      },
    });
  }

  public static async update(organizationId: string, id: string, input: UpdateFamilyInput) {
    const family = await this.findById(organizationId, id);

    return await prisma.family.update({
      where: { id: family.id },
      data: {
        ...(input.familyCode ? { familyCode: input.familyCode } : {}),
        ...(input.familyName ? { familyName: input.familyName } : {}),
        ...(input.primaryContactName !== undefined ? { primaryContactName: input.primaryContactName || null } : {}),
        ...(input.primaryContactPhone !== undefined ? { primaryContactPhone: input.primaryContactPhone || null } : {}),
        ...(input.primaryContactEmail !== undefined ? { primaryContactEmail: input.primaryContactEmail || null } : {}),
        ...(input.address !== undefined ? { address: input.address || null } : {}),
        ...(input.city !== undefined ? { city: input.city || null } : {}),
      },
      include: {
        familyMembers: true,
        studentGuardians: true,
      },
    });
  }

  public static async linkMember(organizationId: string, familyId: string, input: LinkFamilyMemberInput) {
    await this.findById(organizationId, familyId);

    return await prisma.familyMember.upsert({
      where: {
        familyId_personId: {
          familyId,
          personId: input.personId,
        },
      },
      update: {
        relationship: input.relationship,
        isPrimaryContact: input.isPrimaryContact,
        deletedAt: null,
      },
      create: {
        organizationId,
        familyId,
        personId: input.personId,
        relationship: input.relationship,
        isPrimaryContact: input.isPrimaryContact,
      },
      include: {
        person: true,
      },
    });
  }

  public static async linkStudent(organizationId: string, familyId: string, input: LinkStudentGuardianInput) {
    await this.findById(organizationId, familyId);

    // Verify student belongs to this organization
    const student = await prisma.student.findFirst({
      where: { id: input.studentId, organizationId, deletedAt: null },
    });
    if (!student) {
      throw new NotFoundError("Student not found in this organization.");
    }

    return await prisma.studentGuardian.create({
      data: {
        organizationId,
        familyId,
        studentId: input.studentId,
        parentId: input.parentId || null,
        relationship: input.relationship,
        isPrimary: input.isPrimary,
        canPickup: input.canPickup,
      },
      include: {
        student: {
          include: { person: true },
        },
      },
    });
  }

  public static async softDelete(organizationId: string, id: string) {
    const family = await this.findById(organizationId, id);

    return await prisma.family.update({
      where: { id: family.id },
      data: { deletedAt: new Date() },
    });
  }
}
