import { NextRequest } from "next/server";
import { AcademicRepository } from "@/server/repositories";
import { AuditService } from "@/server/services";
import { createClassSchema } from "@/lib/validation";
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

    const items = await AcademicRepository.listClasses(ctx.organizationId, campusId);
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
    const validated = createClassSchema.parse(body);

    requireCampusAccess(ctx, validated.campusId);

    const newClass = await AcademicRepository.createClass(ctx.organizationId, validated);

    await AuditService.log({
      organizationId: ctx.organizationId,
      campusId: newClass.campusId,
      userId: ctx.userId,
      action: "CREATE",
      resource: "CLASS",
      resourceId: newClass.id,
      newValues: { name: newClass.name, code: newClass.code },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess(newClass, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
