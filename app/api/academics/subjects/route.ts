import { NextRequest } from "next/server";
import { AcademicRepository } from "@/server/repositories";
import { AuditService } from "@/server/services";
import { createSubjectSchema } from "@/lib/validation";
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

    const items = await AcademicRepository.listSubjects(ctx.organizationId, campusId);
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
    const validated = createSubjectSchema.parse(body);

    requireCampusAccess(ctx, validated.campusId);

    const subject = await AcademicRepository.createSubject(ctx.organizationId, validated);

    await AuditService.log({
      organizationId: ctx.organizationId,
      campusId: subject.campusId,
      userId: ctx.userId,
      action: "CREATE",
      resource: "SUBJECT",
      resourceId: subject.id,
      newValues: { name: subject.name, code: subject.code },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess(subject, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
