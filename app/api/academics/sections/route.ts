import { NextRequest } from "next/server";
import { AcademicRepository } from "@/server/repositories";
import { AuditService } from "@/server/services";
import { createSectionSchema } from "@/lib/validation";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";
import {
  resolveAuthContext,
  requirePermission,
  requireCampusAccess,
} from "@/server/authorization/auth-context";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "academics.create");

    const body = await request.json();
    const validated = createSectionSchema.parse(body);

    requireCampusAccess(ctx, validated.campusId);

    const section = await AcademicRepository.createSection(ctx.organizationId, validated);

    await AuditService.log({
      organizationId: ctx.organizationId,
      campusId: section.campusId,
      userId: ctx.userId,
      action: "CREATE",
      resource: "SECTION",
      resourceId: section.id,
      newValues: { name: section.name, code: section.code },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess(section, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
