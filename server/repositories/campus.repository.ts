import { prisma } from "@/lib/db/prisma";
import { CreateCampusInput, UpdateCampusInput } from "@/lib/validation";

export class CampusRepository {
  static async findById(organizationId: string, id: string) {
    return prisma.campus.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      include: {
        settings: true,
        organization: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  }

  static async list(organizationId: string, params: { search?: string; page?: number; limit?: number } = {}) {
    const { search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where = {
      organizationId,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { code: { contains: search, mode: "insensitive" as const } },
              { city: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.campus.count({ where }),
      prisma.campus.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
        include: {
          settings: true,
        },
      }),
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

  static async create(organizationId: string, input: CreateCampusInput) {
    const { settings, ...campusData } = input;

    return prisma.campus.create({
      data: {
        ...campusData,
        organizationId,
        settings: settings
          ? {
              create: settings,
            }
          : undefined,
      },
      include: {
        settings: true,
      },
    });
  }

  static async update(organizationId: string, id: string, input: UpdateCampusInput) {
    const { settings, ...campusData } = input;

    return prisma.campus.update({
      where: {
        id,
        organizationId,
      },
      data: {
        ...campusData,
        settings: settings
          ? {
              upsert: {
                create: settings,
                update: settings,
              },
            }
          : undefined,
      },
      include: {
        settings: true,
      },
    });
  }

  static async softDelete(organizationId: string, id: string) {
    return prisma.campus.update({
      where: {
        id,
        organizationId,
      },
      data: {
        deletedAt: new Date(),
        status: "INACTIVE",
      },
    });
  }
}
