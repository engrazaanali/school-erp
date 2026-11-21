import { requireServerSession } from "@/server/auth/session";
import { FeeRepository } from "@/server/repositories/fee.repository";
import { PaymentRepository } from "@/server/repositories/payment.repository";
import { AcademicRepository } from "@/server/repositories/academic.repository";
import { FeeCollectModal } from "./fee-collect-modal";
import { FeeGenerateChallanModal } from "./fee-generate-challan-modal";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FeesAdminPage() {
  const user = await requireServerSession();

  const [invoicesData, summary, classes, academicYears] = await Promise.all([
    FeeRepository.listInvoices({ organizationId: user.organizationId, campusId: user.primaryCampusId || undefined, limit: 50 }),
    PaymentRepository.getFinancialReportSummary({ organizationId: user.organizationId, campusId: user.primaryCampusId || undefined }),
    AcademicRepository.listClasses(user.organizationId, user.primaryCampusId || undefined),
    AcademicRepository.listAcademicYears(user.organizationId, user.primaryCampusId || undefined),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Fee & Challan Management
          </h1>
          <p className="text-sm text-slate-500">
            Invoicing, Challans, Atomic Receipts, WhatsApp share, and collections.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FeeGenerateChallanModal classes={classes} academicYears={academicYears} />
          <FeeCollectModal invoices={invoicesData.items} />
        </div>
      </div>

      {/* Financial Metrics Cards */}
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
            Net Collected
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-2">
            ${summary.netCollected.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
            Outstanding Balance
          </p>
          <p className="text-2xl font-bold text-amber-700 mt-2">
            ${summary.totalOutstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">
            Active Defaulters
          </p>
          <p className="text-2xl font-bold text-rose-600 mt-2">
            {summary.defaultersCount}
          </p>
        </div>
      </div>

      {/* Challans / Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="font-semibold text-slate-800 text-sm">
            Recent Fee Challans / Invoices ({invoicesData.total})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Challan #</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoicesData.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No challans found. Click "Generate Challans" to create the first batch.
                  </td>
                </tr>
              ) : (
                invoicesData.items.map((inv) => {
                  const student = inv.student;
                  const name = student?.person
                    ? `${student.person.firstName} ${student.person.lastName}`
                    : "Unknown";
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-medium text-slate-800">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">{name}</p>
                        <p className="text-xs text-slate-400 font-mono">
                          Adm: {student?.admissionNumber}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {inv.class?.name || "General"}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">
                        ${Number(inv.totalAmount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-medium">
                        ${Number(inv.paidAmount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">
                        ${Number(inv.balanceAmount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            inv.status === "PAID"
                              ? "bg-emerald-100 text-emerald-800"
                              : inv.status === "PARTIAL"
                              ? "bg-blue-100 text-blue-800"
                              : inv.status === "VOID"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Link
                          href={`/invoices/${inv.id}/print`}
                          target="_blank"
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          Challan
                        </Link>
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
