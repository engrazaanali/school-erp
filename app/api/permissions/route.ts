import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { code: "asc" }],
    });

    // Group permissions by module for clean UI consumption
    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = [];
      }
      acc[perm.module]!.push(perm);
      return acc;
    }, {} as Record<string, typeof permissions>);

    return apiSuccess({
      total: permissions.length,
      modules: grouped,
      all: permissions,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
