import { NextRequest } from "next/server";
import { AttendanceRepository } from "@/server/repositories";
import { AuditService } from "@/server/services";
import { createLeaveRequestSchema, updateLeaveRequestStatusSchema } from "@/lib/validation";
import { apiSuccess, handleApiError, BadRequestError } from "@/lib/utils/api-response";
import {
  resolveAuthContext,
  requirePermission,
  requireCampusAccess,
} from "@/server/authorization/auth-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "attendance.read");

    const { searchParams } = new URL(request.url);
    const campusId = searchParams.get("campusId") || ctx.primaryCampusId || undefined;
    const studentId = searchParams.get("studentId") || undefined;

    if (campusId) {
      requireCampusAccess(ctx, campusId);
    }

    const items = await AttendanceRepository.listLeaveRequests(ctx.organizationId, campusId, studentId);
    return apiSuccess(items);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "attendance.write");

    const body = await request.json();
    const validated = createLeaveRequestSchema.parse(body);

    requireCampusAccess(ctx, validated.campusId);

    const leave = await AttendanceRepository.createLeaveRequest(ctx.organizationId, validated);

    await AuditService.log({
      organizationId: ctx.organizationId,
      campusId: leave.campusId,
      userId: ctx.userId,
      action: "CREATE",
      resource: "LEAVE_REQUEST",
      resourceId: leave.id,
      newValues: {
        studentId: leave.studentId,
        startDate: leave.startDate,
        endDate: leave.endDate,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess(leave, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "attendance.write");

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      throw new BadRequestError("id query parameter is required.");
    }

    const body = await request.json();
    const validated = updateLeaveRequestStatusSchema.parse(body);

    const updated = await AttendanceRepository.updateLeaveRequestStatus(
      ctx.organizationId,
      id,
      validated.status,
      ctx.userId
    );

    await AuditService.log({
      organizationId: ctx.organizationId,
      campusId: updated.campusId,
      userId: ctx.userId,
      action: "UPDATE",
      resource: "LEAVE_REQUEST",
      resourceId: updated.id,
      newValues: { status: updated.status },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
