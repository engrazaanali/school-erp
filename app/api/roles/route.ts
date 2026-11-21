import { NextRequest } from "next/server";
import { RoleRepository } from "@/server/repositories";
import { AuditService } from "@/server/services";
import { createRoleSchema } from "@/lib/validation";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";
import { resolveAuthContext, requirePermission } from "@/server/authorization/auth-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "roles.read");

    const roles = await RoleRepository.list(ctx.organizationId || undefined);
    return apiSuccess(roles);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "roles.create");

    const body = await request.json();
    const validated = createRoleSchema.parse(body);

    const role = await RoleRepository.create(ctx.organizationId, validated);

    await AuditService.log({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "CREATE",
      resource: "ROLE",
      resourceId: role.id,
      newValues: { name: role.name, slug: role.slug },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess(role, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
