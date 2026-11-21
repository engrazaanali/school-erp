import { NextRequest } from "next/server";
import { AdmissionRepository } from "@/server/repositories";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";
import {
  resolveAuthContext,
  requirePermission,
  requireCampusAccess,
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
    const inquiry = await AdmissionRepository.findInquiryById(ctx.organizationId, id);

    requireSameOrganization(ctx, inquiry.organizationId);
    requireCampusAccess(ctx, inquiry.campusId);

    return apiSuccess(inquiry);
  } catch (error) {
    return handleApiError(error);
  }
}
