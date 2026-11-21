import { NextRequest } from "next/server";
import { OrganizationRepository } from "@/server/repositories";
import { AuditService } from "@/server/services";
import { updateOrganizationSchema } from "@/lib/validation";
import { apiSuccess, handleApiError, NotFoundError } from "@/lib/utils/api-response";
import { resolveRequestContext } from "@/server/auth/context";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const organization = await OrganizationRepository.findById(id);
    if (!organization) {
      throw new NotFoundError(`Organization with ID ${id} not found.`);
    }

    return apiSuccess(organization);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ctx = resolveRequestContext(request);
    const existing = await OrganizationRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Organization with ID ${id} not found.`);
    }

    const body = await request.json();
    const validated = updateOrganizationSchema.parse(body);

    const updated = await OrganizationRepository.update(id, validated);

    await AuditService.log({
      organizationId: id,
      userId: ctx.userId,
      action: "UPDATE",
      resource: "ORGANIZATION",
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
    const { id } = await params;
    const ctx = resolveRequestContext(request);
    const existing = await OrganizationRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Organization with ID ${id} not found.`);
    }

    await OrganizationRepository.softDelete(id);

    await AuditService.log({
      organizationId: id,
      userId: ctx.userId,
      action: "DELETE",
      resource: "ORGANIZATION",
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
