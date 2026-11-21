import { NextRequest } from "next/server";
import { resolveAuthContext, requirePermission, requireCampusAccess } from "@/server/authorization/auth-context";
import { FeeRepository } from "@/server/repositories/fee.repository";
import { assignStudentFeeSchema } from "@/lib/validation/fee.schema";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    requirePermission(auth, "fees.manage");

    const body = await req.json();
    const validated = assignStudentFeeSchema.parse(body);

    const campusId = validated.campusId || auth.primaryCampusId;
    if (!campusId) {
      throw new Error("Campus ID is required");
    }

    requireCampusAccess(auth, campusId);

    const assignment = await FeeRepository.assignFeeToStudent({
      organizationId: auth.organizationId,
      campusId,
      studentId: validated.studentId,
      feeStructureId: validated.feeStructureId,
      academicYearId: validated.academicYearId,
      classId: validated.classId,
      customAmount: validated.customAmount,
    });

    return apiSuccess(assignment, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
