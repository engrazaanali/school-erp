"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FeeCollectModal({
  invoices,
  onSuccess,
}: {
  invoices: any[];
  onSuccess?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptResult, setReceiptResult] = useState<any | null>(null);

  const router = useRouter();

  const unpaidInvoices = invoices.filter(
    (inv) => inv.status !== "PAID" && inv.status !== "VOID"
  );

  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    const inv = invoices.find((i) => i.id === invId);
    if (inv) {
      setAmount(Number(inv.balanceAmount));
    }
  };

  const handleCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const selectedInv = invoices.find((i) => i.id === selectedInvoiceId);
      if (!selectedInv) {
        throw new Error("Please select a challan / invoice");
      }

      const res = await fetch("/api/payments/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedInv.studentId,
          invoiceId: selectedInvoiceId,
          amount: Number(amount),
          paymentMethod,
          referenceNumber: referenceNumber || null,
          remarks: remarks || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to collect payment");
      }

      setReceiptResult(data.data);
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setReceiptResult(null);
    setSelectedInvoiceId("");
    setAmount("");
    setReferenceNumber("");
    setRemarks("");
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow transition flex items-center gap-1.5"
      >
        <span>💳</span> Collect Fee
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            {receiptResult ? (
              <div>
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                    ✓
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-3">
                    Payment Collected Successfully!
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Receipt #{receiptResult.receipt.receiptNumber} generated
                  </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 my-4 text-sm space-y-2 border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount Paid:</span>
                    <span className="font-bold text-slate-800">
                      ${Number(receiptResult.payment.amount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Method:</span>
                    <span className="font-medium text-slate-800">
                      {receiptResult.payment.paymentMethod}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice Balance:</span>
                    <span className="font-semibold text-slate-700">
                      ${Number(receiptResult.invoice.balanceAmount).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <a
                    href={receiptResult.whatsappShareLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-center font-medium rounded-lg text-sm transition flex items-center justify-center gap-2"
                  >
                    <span>💬</span> Share Receipt on WhatsApp
                  </a>
                  <a
                    href={receiptResult.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white text-center font-medium rounded-lg text-sm transition"
                  >
                    View Official Receipt
                  </a>
                  <button
                    onClick={reset}
                    className="w-full py-2 px-4 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCollect} className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-base">
                    Collect Fee & Generate Receipt
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Challan / Invoice *
                  </label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => handleInvoiceChange(e.target.value)}
                    required
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="">-- Choose Challan --</option>
                    {unpaidInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - {inv.student?.person?.firstName}{" "}
                        {inv.student?.person?.lastName} (Bal: ${Number(inv.balanceAmount).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Amount ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      required
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Method *
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
                    >
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="ONLINE">Online</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="POS">POS / Card</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reference / Cheque Number
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. TR-998822 or Cheque #1234"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Remarks
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Optional remarks"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow disabled:opacity-50"
                  >
                    {loading ? "Processing..." : "Confirm & Collect"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
