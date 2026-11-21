import { NextRequest } from "next/server";
import { StaffRepository } from "@/server/repositories";
import { AuditService } from "@/server/services";
import { createStaffSchema } from "@/lib/validation";
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
    requirePermission(ctx, "users.read");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const department = searchParams.get("department") || undefined;
    const campusId = searchParams.get("campusId") || ctx.primaryCampusId || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (campusId) {
      requireCampusAccess(ctx, campusId);
    }

    const result = await StaffRepository.list(ctx.organizationId, {
      campusId,
      search,
      status,
      department,
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
    requirePermission(ctx, "users.create");

    const body = await request.json();
    const validated = createStaffSchema.parse(body);

    requireCampusAccess(ctx, validated.campusId);

    const staff = await StaffRepository.create(ctx.organizationId, validated);

    await AuditService.log({
      organizationId: ctx.organizationId,
      campusId: staff.campusId,
      userId: ctx.userId,
      action: "CREATE",
      resource: "STAFF",
      resourceId: staff.id,
      newValues: {
        employeeNumber: staff.employeeNumber,
        designation: staff.designation,
        campusId: staff.campusId,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess(staff, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
