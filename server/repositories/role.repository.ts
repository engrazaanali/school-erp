import { prisma } from "@/lib/db/prisma";
import { CreateRoleInput, UpdateRoleInput } from "@/lib/validation";

export class RoleRepository {
  static async list(organizationId?: string) {
    return prisma.role.findMany({
      where: {
        deletedAt: null,
        OR: [
          { isSystem: true, organizationId: null },
          ...(organizationId ? [{ organizationId }] : []),
        ],
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });
  }

  static async findById(id: string, organizationId?: string) {
    return prisma.role.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { isSystem: true },
          ...(organizationId ? [{ organizationId }] : []),
        ],
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  static async create(organizationId: string, input: CreateRoleInput) {
    const { permissionIds, ...roleData } = input;

    return prisma.role.create({
      data: {
        ...roleData,
        organizationId,
        isSystem: false,
        rolePermissions: {
          create: permissionIds.map((pId) => ({
            permissionId: pId,
          })),
        },
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  static async update(id: string, organizationId: string, input: UpdateRoleInput) {
    const { permissionIds, ...roleData } = input;

    return prisma.$transaction(async (tx) => {
      if (permissionIds) {
        await tx.rolePermission.deleteMany({
          where: { roleId: id },
        });

        await tx.rolePermission.createMany({
          data: permissionIds.map((pId) => ({
            roleId: id,
            permissionId: pId,
          })),
        });
      }

      return tx.role.update({
        where: { id, organizationId, isSystem: false },
        data: roleData,
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    });
  }
}
