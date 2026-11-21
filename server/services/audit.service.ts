import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logging";
import { sanitizeLogData } from "@/lib/logging";
import { Prisma } from "@prisma/client";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "VIEW"
  | "EXPORT"
  | "STATUS_CHANGE";

export interface LogAuditParams {
  organizationId: string;
  campusId?: string | null;
  userId?: string | null;
  action: AuditAction | string;
  resource: string;
  resourceId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  tx?: Prisma.TransactionClient;
}

export class AuditService {
  /**
   * Records an immutable audit log entry.
   * Strips sensitive secrets (passwords, tokens, keys) automatically.
   */
  public static async log(params: LogAuditParams): Promise<void> {
    const {
      organizationId,
      campusId,
      userId,
      action,
      resource,
      resourceId,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
      tx,
    } = params;

    // Sanitize any payloads before writing to DB
    const sanitizedOld = oldValues ? (sanitizeLogData(oldValues) as Prisma.InputJsonValue) : Prisma.JsonNull;
    const sanitizedNew = newValues ? (sanitizeLogData(newValues) as Prisma.InputJsonValue) : Prisma.JsonNull;

    const dbClient = tx ?? prisma;

    try {
      await dbClient.auditLog.create({
        data: {
          organizationId,
          campusId: campusId ?? null,
          userId: userId ?? null,
          action,
          resource,
          resourceId: resourceId ?? null,
          oldValues: sanitizedOld,
          newValues: sanitizedNew,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      });

      logger.info(`Audit log captured: [${action}] on ${resource}`, {
        organizationId,
        campusId,
        userId,
        action,
        resource,
        resourceId,
      });
    } catch (err) {
      // Audit failures must be logged with high severity but not crash critical paths unless in strict tx
      logger.error("Failed to write audit log record", err, {
        organizationId,
        action,
        resource,
        resourceId,
      });

      if (tx) {
        throw err;
      }
    }
  }

  /**
   * Retrieves paginated audit logs for a tenant, optionally scoped by campus.
   */
  public static async getTenantLogs(params: {
    organizationId: string;
    campusId?: string;
    resource?: string;
    action?: string;
    page?: number;
    limit?: number;
  }) {
    const { organizationId, campusId, resource, action, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      organizationId,
      ...(campusId ? { campusId } : {}),
      ...(resource ? { resource } : {}),
      ...(action ? { action } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              person: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          campus: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
