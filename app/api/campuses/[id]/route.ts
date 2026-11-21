import { NextRequest } from "next/server";
import { CampusRepository } from "@/server/repositories";
import { AuditService } from "@/server/services";
import { updateCampusSchema } from "@/lib/validation";
import { apiSuccess, handleApiError, NotFoundError } from "@/lib/utils/api-response";
import { requireTenantContext } from "@/server/auth/context";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = requireTenantContext(request);
    const { id } = await params;

    const campus = await CampusRepository.findById(ctx.organizationId, id);
    if (!campus) {
      throw new NotFoundError(`Campus with ID ${id} not found in this organization.`);
    }

    return apiSuccess(campus);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = requireTenantContext(request);
    const { id } = await params;

    const existing = await CampusRepository.findById(ctx.organizationId, id);
    if (!existing) {
      throw new NotFoundError(`Campus with ID ${id} not found in this organization.`);
    }

    const body = await request.json();
    const validated = updateCampusSchema.parse(body);

    const updated = await CampusRepository.update(ctx.organizationId, id, validated);

    await AuditService.log({
      organizationId: ctx.organizationId,
      campusId: id,
      userId: ctx.userId,
      action: "UPDATE",
      resource: "CAMPUS",
      resourceId: id,
      oldValues: { name: existing.name, status: existing.status },
      newValues: validated,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = requireTenantContext(request);
    const { id } = await params;

    const existing = await CampusRepository.findById(ctx.organizationId, id);
    if (!existing) {
      throw new NotFoundError(`Campus with ID ${id} not found in this organization.`);
    }

    await CampusRepository.softDelete(ctx.organizationId, id);

    await AuditService.log({
      organizationId: ctx.organizationId,
      campusId: id,
      userId: ctx.userId,
      action: "DELETE",
      resource: "CAMPUS",
      resourceId: id,
      oldValues: { name: existing.name, status: existing.status },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess({ deleted: true, id });
  } catch (error) {
    return handleApiError(error);
  }
}
