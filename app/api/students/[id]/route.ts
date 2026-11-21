import { NextRequest } from "next/server";
import { StudentRepository } from "@/server/repositories";
import { AuditService } from "@/server/services";
import { updateStudentSchema } from "@/lib/validation";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";
import {
  resolveAuthContext,
  requirePermission,
  requireCampusAccess,
  requireSameOrganization,
} from "@/server/authorization/auth-context";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "students.read");

    const { id } = await params;
    const student = await StudentRepository.findById(ctx.organizationId, id);

    requireSameOrganization(ctx, student.organizationId);
    requireCampusAccess(ctx, student.campusId);

    return apiSuccess(student);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "students.update");

    const { id } = await params;
    const existing = await StudentRepository.findById(ctx.organizationId, id);

    requireSameOrganization(ctx, existing.organizationId);
    requireCampusAccess(ctx, existing.campusId);

    const body = await request.json();
    const validated = updateStudentSchema.parse(body);

    const updated = await StudentRepository.update(ctx.organizationId, id, validated);

    await AuditService.log({
      organizationId: ctx.organizationId,
      campusId: updated.campusId,
      userId: ctx.userId,
      action: "UPDATE",
      resource: "STUDENT",
      resourceId: updated.id,
      oldValues: {
        admissionNumber: existing.admissionNumber,
        status: existing.status,
      },
      newValues: {
        admissionNumber: updated.admissionNumber,
        status: updated.status,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "students.delete");

    const { id } = await params;
    const existing = await StudentRepository.findById(ctx.organizationId, id);

    requireSameOrganization(ctx, existing.organizationId);
    requireCampusAccess(ctx, existing.campusId);

    const deleted = await StudentRepository.softDelete(ctx.organizationId, id);

    await AuditService.log({
      organizationId: ctx.organizationId,
      campusId: existing.campusId,
      userId: ctx.userId,
      action: "DELETE",
      resource: "STUDENT",
      resourceId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess({ deleted: true, id: deleted.id });
  } catch (error) {
    return handleApiError(error);
  }
}
