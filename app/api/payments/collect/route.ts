import { NextRequest } from "next/server";
import { resolveAuthContext, requirePermission, requireCampusAccess } from "@/server/authorization/auth-context";
import { PaymentRepository } from "@/server/repositories/payment.repository";
import { FeeService } from "@/server/services/fee.service";
import { collectPaymentSchema } from "@/lib/validation/payment.schema";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    requirePermission(auth, "fees.view");

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const paymentMethod = searchParams.get("paymentMethod") || undefined;
    const studentId = searchParams.get("studentId") || undefined;
    const campusId = searchParams.get("campusId") || auth.primaryCampusId || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (campusId) {
      requireCampusAccess(auth, campusId);
    }

    const result = await PaymentRepository.listPayments({
      organizationId: auth.organizationId,
      campusId,
      studentId,
      paymentMethod,
      search,
      page,
      limit,
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    requirePermission(auth, "fees.collect");

    const body = await req.json();
    const validated = collectPaymentSchema.parse(body);

    const campusId = validated.campusId || auth.primaryCampusId;
    if (!campusId) {
      throw new Error("Campus ID is required");
    }

    requireCampusAccess(auth, campusId);

    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    // ATOMIC PAYMENT TRANSACTION
    const result = await PaymentRepository.collectPaymentAtomic({
      organizationId: auth.organizationId,
      campusId,
      studentId: validated.studentId,
      invoiceId: validated.invoiceId,
      amount: validated.amount,
      paymentMethod: validated.paymentMethod,
      referenceNumber: validated.referenceNumber,
      remarks: validated.remarks,
      receivedById: auth.userId,
      ipAddress,
      userAgent,
    });

    // Generate WhatsApp Share links for UI quick-share
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const waShare = FeeService.generateWhatsAppReceiptShareLink({
      studentName: "Student",
      receiptNumber: result.receipt.receiptNumber,
      amount: validated.amount,
      currency: "USD",
      accessToken: result.receipt.accessToken,
      baseUrl,
    });

    return apiSuccess(
      {
        ...result,
        receiptUrl: waShare.receiptUrl,
        whatsappShareLink: waShare.whatsappShareLink,
      },
      undefined,
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
