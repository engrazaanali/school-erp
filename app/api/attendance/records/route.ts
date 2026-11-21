import { NextRequest } from "next/server";
import { AttendanceRepository } from "@/server/repositories";
import { AttendanceService } from "@/server/services";
import { apiSuccess, handleApiError, BadRequestError } from "@/lib/utils/api-response";
import {
  resolveAuthContext,
  requirePermission,
} from "@/server/authorization/auth-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "attendance.read");

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    if (!studentId) {
      throw new BadRequestError("studentId query parameter is required.");
    }

    // Strict Parent authorization: verifies parent can only view their own child's attendance
    await AttendanceService.verifyParentStudentAccess(ctx, studentId);

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const records = await AttendanceRepository.listStudentAttendance(
      ctx.organizationId,
      studentId,
      { startDate, endDate }
    );

    return apiSuccess(records);
  } catch (error) {
    return handleApiError(error);
  }
}
