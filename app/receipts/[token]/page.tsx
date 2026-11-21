import { notFound } from "next/navigation";
import { PaymentRepository } from "@/server/repositories/payment.repository";
import { FeeService } from "@/server/services/fee.service";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PublicReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const receipt = await PaymentRepository.getReceiptByAccessToken(token);

  if (!receipt) {
    notFound();
  }

  const { payment, organization, campus } = receipt;
  const student = payment.student;
  const studentName = `${student.person.firstName} ${student.person.lastName}`;
  const currency = organization.settings?.currency || "USD";

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { whatsappShareLink } = FeeService.generateWhatsAppReceiptShareLink({
    recipientPhone: student.person.phone,
    studentName,
    receiptNumber: receipt.receiptNumber,
    amount: Number(payment.amount),
    currency,
    accessToken: receipt.accessToken,
    baseUrl,
  });

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        {/* Header with Organization Branding */}
        <div className="border-b border-slate-200 pb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {organization.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{campus.name}</p>
          <div className="inline-block mt-3 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full uppercase tracking-wider">
            Official Payment Receipt
          </div>
        </div>

        {/* Receipt Meta */}
        <div className="grid grid-cols-2 gap-4 py-6 text-sm border-b border-slate-100">
          <div>
            <p className="text-slate-500">Receipt Number</p>
            <p className="font-mono font-semibold text-slate-800">{receipt.receiptNumber}</p>
          </div>
          <div>
            <p className="text-slate-500">Issue Date</p>
            <p className="font-medium text-slate-800">
              {new Date(receipt.issuedDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Student Name</p>
            <p className="font-semibold text-slate-900">{studentName}</p>
            <p className="text-xs text-slate-400">Adm: {student.admissionNumber}</p>
          </div>
          <div>
            <p className="text-slate-500">Payment Method</p>
            <p className="font-medium text-slate-800">{payment.paymentMethod}</p>
            {payment.referenceNumber && (
              <p className="text-xs text-slate-400 font-mono">Ref: {payment.referenceNumber}</p>
            )}
          </div>
        </div>

        {/* Invoiced Allocation Breakdown */}
        <div className="py-6 border-b border-slate-200">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Payment Allocations
          </h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 text-xs">
                <th className="py-2">Challan / Description</th>
                <th className="py-2 text-right">Amount Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payment.allocations.map((alloc) => (
                <tr key={alloc.id}>
                  <td className="py-3">
                    <p className="font-medium text-slate-800">
                      {alloc.invoice.title}
                    </p>
                    <p className="text-xs font-mono text-slate-400">
                      Challan #{alloc.invoice.invoiceNumber}
                    </p>
                  </td>
                  <td className="py-3 text-right font-medium text-slate-900">
                    {currency} {Number(alloc.allocatedAmount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total Summary */}
        <div className="py-6 flex justify-between items-center text-lg font-bold border-b border-slate-200">
          <span className="text-slate-900">Total Paid</span>
          <span className="text-emerald-700">
            {currency} {Number(payment.amount).toFixed(2)}
          </span>
        </div>

        {/* WhatsApp & Print Actions */}
        <div className="pt-6 flex flex-col sm:flex-row gap-3 justify-end items-center">
          <a
            href={whatsappShareLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow transition"
          >
            <span className="mr-2">💬</span> Share on WhatsApp
          </a>
          <button
            type="button"
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm rounded-lg shadow transition"
          >
            🖨️ Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
