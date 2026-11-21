import { NextRequest } from "next/server";
import { StaffRepository } from "@/server/repositories";
import { AuditService } from "@/server/services";
import { updateStaffSchema } from "@/lib/validation";
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
    requirePermission(ctx, "users.read");

    const { id } = await params;
    const staff = await StaffRepository.findById(ctx.organizationId, id);

    requireSameOrganization(ctx, staff.organizationId);
    requireCampusAccess(ctx, staff.campusId);

    return apiSuccess(staff);
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
    requirePermission(ctx, "users.update");

    const { id } = await params;
    const existing = await StaffRepository.findById(ctx.organizationId, id);

    requireSameOrganization(ctx, existing.organizationId);
    requireCampusAccess(ctx, existing.campusId);

    const body = await request.json();
    const validated = updateStaffSchema.parse(body);

    const updated = await StaffRepository.update(ctx.organizationId, id, validated);

    await AuditService.log({
      organizationId: ctx.organizationId,
      campusId: updated.campusId,
      userId: ctx.userId,
      action: "UPDATE",
      resource: "STAFF",
      resourceId: updated.id,
      oldValues: { designation: existing.designation, status: existing.status },
      newValues: { designation: updated.designation, status: updated.status },
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
    requirePermission(ctx, "users.delete");

    const { id } = await params;
    const existing = await StaffRepository.findById(ctx.organizationId, id);

    requireSameOrganization(ctx, existing.organizationId);
    requireCampusAccess(ctx, existing.campusId);

    const deleted = await StaffRepository.softDelete(ctx.organizationId, id);

    await AuditService.log({
      organizationId: ctx.organizationId,
      campusId: existing.campusId,
      userId: ctx.userId,
      action: "DELETE",
      resource: "STAFF",
      resourceId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess({ deleted: true, id: deleted.id });
  } catch (error) {
    return handleApiError(error);
  }
}
