import { NextRequest } from "next/server";
import { AcademicRepository } from "@/server/repositories";
import { AuditService } from "@/server/services";
import { createAcademicYearSchema } from "@/lib/validation";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";
import {
  resolveAuthContext,
  requirePermission,
  requireCampusAccess,
} from "@/server/authorization/auth-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "academics.read");

    const { searchParams } = new URL(request.url);
    const campusId = searchParams.get("campusId") || ctx.primaryCampusId || undefined;

    if (campusId) {
      requireCampusAccess(ctx, campusId);
    }

    const items = await AcademicRepository.listAcademicYears(ctx.organizationId, campusId);
    return apiSuccess(items);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "academics.create");

    const body = await request.json();
    const validated = createAcademicYearSchema.parse(body);

    requireCampusAccess(ctx, validated.campusId);

    const year = await AcademicRepository.createAcademicYear(ctx.organizationId, validated);

    await AuditService.log({
      organizationId: ctx.organizationId,
      campusId: year.campusId,
      userId: ctx.userId,
      action: "CREATE",
      resource: "ACADEMIC_YEAR",
      resourceId: year.id,
      newValues: { name: year.name, code: year.code },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess(year, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
