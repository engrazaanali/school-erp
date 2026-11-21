import { NextRequest } from "next/server";
import { FamilyRepository } from "@/server/repositories";
import { AuditService } from "@/server/services";
import { createFamilySchema } from "@/lib/validation";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";
import {
  resolveAuthContext,
  requirePermission,
} from "@/server/authorization/auth-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "students.read");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await FamilyRepository.list(ctx.organizationId, {
      search,
      page,
      limit,
    });

    return apiSuccess(result.items, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "students.create");

    const body = await request.json();
    const validated = createFamilySchema.parse(body);

    const family = await FamilyRepository.create(ctx.organizationId, validated);

    await AuditService.log({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "CREATE",
      resource: "FAMILY",
      resourceId: family.id,
      newValues: {
        familyCode: family.familyCode,
        familyName: family.familyName,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess(family, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
