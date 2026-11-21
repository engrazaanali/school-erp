import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

/**
 * Executes a callback within a Prisma transaction where the PostgreSQL session variables
 * app.current_organization_id and app.current_campus_id are set locally.
 * This guarantees defense-in-depth Row-Level Security (RLS) enforcement at the database layer.
 */
export async function withTenantContext<T>(
  organizationId: string,
  campusId: string | null | undefined,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Escape parameter safely to avoid SQL injection in local config
    const safeOrgId = organizationId.replace(/'/g, "''");
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_organization_id = '${safeOrgId}';`
    );

    if (campusId) {
      const safeCampusId = campusId.replace(/'/g, "''");
      await tx.$executeRawUnsafe(
        `SET LOCAL app.current_campus_id = '${safeCampusId}';`
      );
    }

    return fn(tx);
  });
}
