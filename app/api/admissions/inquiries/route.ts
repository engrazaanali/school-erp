import { NextRequest } from "next/server";
import { AdmissionRepository } from "@/server/repositories";
import { AuditService } from "@/server/services";
import { createAdmissionInquirySchema } from "@/lib/validation";
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
    requirePermission(ctx, "students.read");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const campusId = searchParams.get("campusId") || ctx.primaryCampusId || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (campusId) {
      requireCampusAccess(ctx, campusId);
    }

    const result = await AdmissionRepository.listInquiries(ctx.organizationId, {
      campusId,
      status,
      search,
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
    requirePermission(ctx, "students.create");

    const body = await request.json();
    const validated = createAdmissionInquirySchema.parse(body);

    requireCampusAccess(ctx, validated.campusId);

    const inquiry = await AdmissionRepository.createInquiry(ctx.organizationId, validated);

    await AuditService.log({
      organizationId: ctx.organizationId,
      campusId: inquiry.campusId,
      userId: ctx.userId,
      action: "CREATE",
      resource: "ADMISSION_INQUIRY",
      resourceId: inquiry.id,
      newValues: {
        inquiryNumber: inquiry.inquiryNumber,
        studentName: `${inquiry.studentFirstName} ${inquiry.studentLastName}`,
        gradeApplying: inquiry.gradeApplying,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess(inquiry, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
