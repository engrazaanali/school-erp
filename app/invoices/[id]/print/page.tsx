import { notFound } from "next/navigation";
import { FeeRepository } from "@/server/repositories/fee.repository";

export const dynamic = "force-dynamic";

export default async function PrintableChallanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Look up across all organizations for public/authorized view (or scoped via organization)
  const invoice = await FeeRepository.getInvoiceById(id, ""); // fallback lookup or query

  // Or let's do a direct prisma query to support public student challan printing
  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 flex justify-center">
      <div className="max-w-3xl w-full bg-white border border-slate-300 rounded-lg p-8 shadow-sm print:shadow-none print:border-none">
        <div className="text-center pb-6 border-b border-slate-300">
          <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900">
            Fee Challan / Invoice
          </h1>
          <p className="text-xs text-slate-500 mt-1">Student / Parent Copy</p>
        </div>

        <div className="mt-6 flex justify-between text-sm">
          <div>
            <p className="text-slate-500">Challan Reference</p>
            <p className="font-mono font-bold text-base text-slate-800">#{id.slice(0, 8)}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500">Status</p>
            <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 uppercase">
              Challan
            </span>
          </div>
        </div>

        <div className="mt-8 border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
            Fee Breakdown
          </div>
          <div className="p-4 text-sm text-slate-600">
            Standard Term Tuition & Campus Facility Charges
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
          This is an official computer-generated fee document. Please retain for your records.
        </div>
      </div>
    </div>
  );
}
