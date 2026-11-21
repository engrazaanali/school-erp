import { NextRequest } from "next/server";
import { StudentRepository } from "@/server/repositories";
import { AuditService } from "@/server/services";
import { createStudentSchema } from "@/lib/validation";
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
    requirePermission(ctx, "students.read");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const campusId = searchParams.get("campusId") || ctx.primaryCampusId || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // If campusId specified, verify user has campus access
    if (campusId) {
      requireCampusAccess(ctx, campusId);
    }

    const result = await StudentRepository.list(ctx.organizationId, {
      campusId,
      search,
      status,
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
    const validated = createStudentSchema.parse(body);

    // Strict campus authorization: user must have rights in the campus the student is being enrolled in
    requireCampusAccess(ctx, validated.campusId);

    const student = await StudentRepository.create(ctx.organizationId, validated);

    await AuditService.log({
      organizationId: ctx.organizationId,
      campusId: student.campusId,
      userId: ctx.userId,
      action: "CREATE",
      resource: "STUDENT",
      resourceId: student.id,
      newValues: {
        admissionNumber: student.admissionNumber,
        firstName: student.person.firstName,
        lastName: student.person.lastName,
        campusId: student.campusId,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess(student, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
