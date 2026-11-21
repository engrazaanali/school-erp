import { NextRequest } from "next/server";
import { AdmissionRepository } from "@/server/repositories";
import { AuditService } from "@/server/services";
import { convertInquiryToAdmissionSchema } from "@/lib/validation";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";
import {
  resolveAuthContext,
  requirePermission,
} from "@/server/authorization/auth-context";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "students.create");

    const body = await request.json();
    const validated = convertInquiryToAdmissionSchema.parse(body);

    const result = await AdmissionRepository.convertToAdmission(ctx.organizationId, validated);

    await AuditService.log({
      organizationId: ctx.organizationId,
      campusId: result.admission.campusId,
      userId: ctx.userId,
      action: "CREATE",
      resource: "ADMISSION",
      resourceId: result.admission.id,
      newValues: {
        applicationNumber: result.admission.applicationNumber,
        studentId: result.student.id,
        gradeEnrolled: result.admission.gradeEnrolled,
        academicYear: result.admission.academicYear,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return apiSuccess(result, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
