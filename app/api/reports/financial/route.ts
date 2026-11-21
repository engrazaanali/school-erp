import { NextRequest } from "next/server";
import { resolveAuthContext, requirePermission, requireCampusAccess } from "@/server/authorization/auth-context";
import { PaymentRepository } from "@/server/repositories/payment.repository";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    requirePermission(auth, "fees.view");

    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get("campusId") || auth.primaryCampusId || undefined;
    const startStr = searchParams.get("startDate");
    const endStr = searchParams.get("endDate");

    if (campusId) {
      requireCampusAccess(auth, campusId);
    }

    const startDate = startStr ? new Date(startStr) : undefined;
    const endDate = endStr ? new Date(endStr) : undefined;

    const summary = await PaymentRepository.getFinancialReportSummary({
      organizationId: auth.organizationId,
      campusId,
      startDate,
      endDate,
    });

    return apiSuccess(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
