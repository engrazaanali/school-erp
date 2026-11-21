import { NextRequest } from "next/server";
import { AttendanceRepository } from "@/server/repositories";
import { AttendanceService, AuditService } from "@/server/services";
import { markAttendanceSchema } from "@/lib/validation";
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
    const classId = searchParams.get("classId");
    const sectionId = searchParams.get("sectionId");
    const dateStr = searchParams.get("date");

    if (!classId || !sectionId || !dateStr) {
      throw new BadRequestError("classId, sectionId, and date query parameters are required.");
    }

    const date = new Date(dateStr);
    const session = await AttendanceRepository.findSession({
      organizationId: ctx.organizationId,
      classId,
      sectionId,
      date,
    });

    return apiSuccess(session);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "attendance.write");

    const body = await request.json();
    const validated = markAttendanceSchema.parse(body);

    requireCampusAccess(ctx, validated.campusId);

    // Enforce teacher assignment scope check & emit absent events
    const result = await AttendanceService.submitAttendance(ctx, validated);

    await AuditService.log({
      organizationId: ctx.organizationId,
      campusId: validated.campusId,
      userId: ctx.userId,
      action: "CREATE",
      resource: "ATTENDANCE_SESSION",
      resourceId: result.session.id,
      newValues: {
        classId: validated.classId,
        sectionId: validated.sectionId,
        date: validated.date.toISOString().split("T")[0],
        totalPupils: validated.records.length,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess(result, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
