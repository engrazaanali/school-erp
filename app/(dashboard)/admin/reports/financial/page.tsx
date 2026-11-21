import { requireServerSession } from "@/server/auth/session";
import { PaymentRepository } from "@/server/repositories/payment.repository";

export const dynamic = "force-dynamic";

export default async function FinancialReportsPage() {
  const user = await requireServerSession();

  const [summary, paymentsData] = await Promise.all([
    PaymentRepository.getFinancialReportSummary({
      organizationId: user.organizationId,
      campusId: user.primaryCampusId || undefined,
    }),
    PaymentRepository.listPayments({
      organizationId: user.organizationId,
      campusId: user.primaryCampusId || undefined,
      limit: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Financial & Fee Collection Reports
        </h1>
        <p className="text-sm text-slate-500">
          Daily fee collections, payment methods breakdown, arrears, and refund audit history.
        </p>
      </div>

      {/* Summary KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Invoiced
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ${summary.totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            Gross Collections
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-2">
            ${summary.totalCollected.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">
            Total Refunds / Reversals
          </p>
          <p className="text-2xl font-bold text-rose-600 mt-2">
            ${summary.totalRefunded.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            Net Revenue
          </p>
          <p className="text-2xl font-bold text-indigo-700 mt-2">
            ${summary.netCollected.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Collection By Payment Method */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">
          Collections by Payment Channel
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {Object.entries(summary.byMethod).map(([method, amt]) => (
            <div key={method} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase">{method}</p>
              <p className="text-lg font-bold text-slate-800 mt-1">
                ${amt.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          ))}
          {Object.keys(summary.byMethod).length === 0 && (
            <p className="text-xs text-slate-400 col-span-5">No payments collected yet.</p>
          )}
        </div>
      </div>

      {/* Payment Transaction Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-800 text-sm">
            Payment Audit Transactions ({paymentsData.total})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Payment #</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Receipt Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paymentsData.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No payment transactions recorded.
                  </td>
                </tr>
              ) : (
                paymentsData.items.map((p) => {
                  const receipt = p.receipts[0];
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-medium text-slate-800">
                        {p.paymentNumber}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">
                          {p.student.person.firstName} {p.student.person.lastName}
                        </p>
                        <p className="text-xs text-slate-400">
                          {p.student.admissionNumber}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(p.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {p.paymentMethod}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-xs">
                        {p.referenceNumber || "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        ${Number(p.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            p.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {receipt ? (
                          <a
                            href={`/receipts/${receipt.accessToken}`}
                            target="_blank"
                            className="text-xs text-emerald-600 hover:underline font-semibold"
                          >
                            #{receipt.receiptNumber}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
