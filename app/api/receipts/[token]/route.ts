import { NextRequest } from "next/server";
import { PaymentRepository } from "@/server/repositories/payment.repository";
import { FeeService } from "@/server/services/fee.service";
import { apiSuccess, handleApiError, NotFoundError } from "@/lib/utils/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const receipt = await PaymentRepository.getReceiptByAccessToken(token);

    if (!receipt) {
      throw new NotFoundError("Receipt not found or link has expired");
    }

    const student = receipt.payment.student;
    const studentName = `${student.person.firstName} ${student.person.lastName}`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const wa = FeeService.generateWhatsAppReceiptShareLink({
      recipientPhone: student.person.phone,
      studentName,
      receiptNumber: receipt.receiptNumber,
      amount: Number(receipt.payment.amount),
      currency: receipt.organization.settings?.currency || "USD",
      accessToken: receipt.accessToken,
      baseUrl,
    });

    return apiSuccess({
      receipt,
      whatsappShareLink: wa.whatsappShareLink,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
