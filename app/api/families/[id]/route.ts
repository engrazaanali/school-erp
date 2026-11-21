import { NextRequest } from "next/server";
import { FamilyRepository } from "@/server/repositories";
import { AuditService } from "@/server/services";
import {
  updateFamilySchema,
  linkFamilyMemberSchema,
  linkStudentGuardianSchema,
} from "@/lib/validation";
import { apiSuccess, handleApiError, BadRequestError } from "@/lib/utils/api-response";
import {
  resolveAuthContext,
  requirePermission,
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
    const family = await FamilyRepository.findById(ctx.organizationId, id);

    requireSameOrganization(ctx, family.organizationId);

    return apiSuccess(family);
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
    const existing = await FamilyRepository.findById(ctx.organizationId, id);
    requireSameOrganization(ctx, existing.organizationId);

    const body = await request.json();
    const validated = updateFamilySchema.parse(body);

    const updated = await FamilyRepository.update(ctx.organizationId, id, validated);

    await AuditService.log({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "UPDATE",
      resource: "FAMILY",
      resourceId: updated.id,
      oldValues: { familyCode: existing.familyCode, familyName: existing.familyName },
      newValues: { familyCode: updated.familyCode, familyName: updated.familyName },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "students.create");

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action"); // "link-member" or "link-student"

    const body = await request.json();

    if (action === "link-member") {
      const validated = linkFamilyMemberSchema.parse(body);
      const member = await FamilyRepository.linkMember(ctx.organizationId, id, validated);
      return apiSuccess(member, undefined, 201);
    } else if (action === "link-student") {
      const validated = linkStudentGuardianSchema.parse(body);
      const link = await FamilyRepository.linkStudent(ctx.organizationId, id, validated);
      return apiSuccess(link, undefined, 201);
    } else {
      throw new BadRequestError(
        "Invalid action parameter. Must be ?action=link-member or ?action=link-student"
      );
    }
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
    const existing = await FamilyRepository.findById(ctx.organizationId, id);
    requireSameOrganization(ctx, existing.organizationId);

    const deleted = await FamilyRepository.softDelete(ctx.organizationId, id);

    await AuditService.log({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "DELETE",
      resource: "FAMILY",
      resourceId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess({ deleted: true, id: deleted.id });
  } catch (error) {
    return handleApiError(error);
  }
}
