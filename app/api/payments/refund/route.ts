import { NextRequest } from "next/server";
import { resolveAuthContext, requirePermission, requireCampusAccess } from "@/server/authorization/auth-context";
import { PaymentRepository } from "@/server/repositories/payment.repository";
import { refundPaymentSchema } from "@/lib/validation/payment.schema";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    requirePermission(auth, "fees.manage");

    const body = await req.json();
    const validated = refundPaymentSchema.parse(body);

    const campusId = auth.primaryCampusId;
    if (!campusId) {
      throw new Error("Campus ID required for refund");
    }

    requireCampusAccess(auth, campusId);

    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    // REFUND / REVERSAL TRANSACTION
    const refund = await PaymentRepository.refundPaymentAtomic({
      organizationId: auth.organizationId,
      campusId,
      paymentId: validated.paymentId,
      amount: validated.amount,
      reason: validated.reason,
      processedById: auth.userId,
      ipAddress,
      userAgent,
    });

    return apiSuccess(refund, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
