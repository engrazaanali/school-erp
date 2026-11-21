import { NextRequest } from "next/server";
import { CampusRepository } from "@/server/repositories";
import { AuditService } from "@/server/services";
import { createCampusSchema } from "@/lib/validation";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";
import { resolveAuthContext, requirePermission } from "@/server/authorization/auth-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "campuses.read");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await CampusRepository.list(ctx.organizationId, { search, page, limit });
    return apiSuccess(result.items, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "campuses.create");

    const body = await request.json();
    const validated = createCampusSchema.parse(body);

    const campus = await CampusRepository.create(ctx.organizationId, validated);

    await AuditService.log({
      organizationId: ctx.organizationId,
      campusId: campus.id,
      userId: ctx.userId,
      action: "CREATE",
      resource: "CAMPUS",
      resourceId: campus.id,
      newValues: { name: campus.name, code: campus.code },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess(campus, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
