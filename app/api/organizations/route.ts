import { NextRequest } from "next/server";
import { OrganizationRepository } from "@/server/repositories";
import { AuditService } from "@/server/services";
import { createOrganizationSchema } from "@/lib/validation";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";
import { resolveAuthContext, requirePermission } from "@/server/authorization/auth-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "organizations.read");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await OrganizationRepository.list({ search, page, limit });
    return apiSuccess(result.items, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "organizations.create");

    const body = await request.json();
    const validated = createOrganizationSchema.parse(body);

    const organization = await OrganizationRepository.create(validated);

    await AuditService.log({
      organizationId: organization.id,
      userId: ctx.userId,
      action: "CREATE",
      resource: "ORGANIZATION",
      resourceId: organization.id,
      newValues: { name: organization.name, code: organization.code, slug: organization.slug },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess(organization, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
