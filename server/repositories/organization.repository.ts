import { prisma } from "@/lib/db/prisma";
import { CreateOrganizationInput, UpdateOrganizationInput } from "@/lib/validation";

export class OrganizationRepository {
  static async findById(id: string) {
    return prisma.organization.findFirst({
      where: { id, deletedAt: null },
      include: {
        settings: true,
        campuses: {
          where: { deletedAt: null },
          include: { settings: true },
        },
      },
    });
  }

  static async findBySlug(slug: string) {
    return prisma.organization.findFirst({
      where: { slug, deletedAt: null },
      include: { settings: true },
    });
  }

  static async list(params: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { code: { contains: search, mode: "insensitive" as const } },
              { slug: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.organization.count({ where }),
      prisma.organization.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          settings: true,
          _count: {
            select: {
              campuses: { where: { deletedAt: null } },
              users: { where: { deletedAt: null } },
            },
          },
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

  static async create(input: CreateOrganizationInput) {
    return prisma.organization.create({
      data: {
        name: input.name,
        slug: input.slug,
        code: input.code,
        settings: input.settings
          ? {
              create: input.settings,
            }
          : undefined,
      },
      include: { settings: true },
    });
  }

  static async update(id: string, input: UpdateOrganizationInput) {
    const { settings, ...orgData } = input;

    return prisma.organization.update({
      where: { id },
      data: {
        ...orgData,
        settings: settings
          ? {
              upsert: {
                create: settings,
                update: settings,
              },
            }
          : undefined,
      },
      include: { settings: true },
    });
  }

  static async softDelete(id: string) {
    return prisma.organization.update({
      where: { id },
      data: { deletedAt: new Date(), status: "INACTIVE" },
    });
  }
}
