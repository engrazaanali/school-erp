import { NextRequest } from "next/server";
import { AcademicRepository } from "@/server/repositories";
import { AuditService } from "@/server/services";
import { createTeacherAssignmentSchema } from "@/lib/validation";
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
    const classId = searchParams.get("classId") || undefined;
    const sectionId = searchParams.get("sectionId") || undefined;
    const teacherId = searchParams.get("teacherId") || undefined;

    if (campusId) {
      requireCampusAccess(ctx, campusId);
    }

    const items = await AcademicRepository.listTeacherAssignments(ctx.organizationId, {
      campusId,
      classId,
      sectionId,
      teacherId,
    });

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
    const validated = createTeacherAssignmentSchema.parse(body);

    requireCampusAccess(ctx, validated.campusId);

    const assignment = await AcademicRepository.createTeacherAssignment(ctx.organizationId, validated);

    await AuditService.log({
      organizationId: ctx.organizationId,
      campusId: assignment.campusId,
      userId: ctx.userId,
      action: "CREATE",
      resource: "TEACHER_ASSIGNMENT",
      resourceId: assignment.id,
      newValues: {
        teacherId: assignment.teacherId,
        classId: assignment.classId,
        sectionId: assignment.sectionId,
        subjectId: assignment.subjectId,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess(assignment, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
