import { NextRequest } from "next/server";
import { AcademicRepository } from "@/server/repositories";
import { AuditService } from "@/server/services";
import { createStudentEnrollmentSchema } from "@/lib/validation";
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
    const academicYearId = searchParams.get("academicYearId") || undefined;

    if (campusId) {
      requireCampusAccess(ctx, campusId);
    }

    const items = await AcademicRepository.listEnrollments(ctx.organizationId, {
      campusId,
      classId,
      sectionId,
      academicYearId,
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
    const validated = createStudentEnrollmentSchema.parse(body);

    requireCampusAccess(ctx, validated.campusId);

    const enrollment = await AcademicRepository.enrollStudent(ctx.organizationId, validated);

    await AuditService.log({
      organizationId: ctx.organizationId,
      campusId: enrollment.campusId,
      userId: ctx.userId,
      action: "CREATE",
      resource: "STUDENT_ENROLLMENT",
      resourceId: enrollment.id,
      newValues: {
        studentId: enrollment.studentId,
        classId: enrollment.classId,
        sectionId: enrollment.sectionId,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess(enrollment, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
