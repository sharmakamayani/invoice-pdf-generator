"use client";

import { useState, useRef } from "react";
import type { InvoiceData } from "@/lib/types";
import { computeInvoice } from "@/lib/calculations";

interface Props {
  data: InvoiceData;
}

export default function InvoicePreview({ data }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const prevUrlRef = useRef<string | null>(null);

  async function generatePDF(download = false) {
    setLoading(true);
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (download) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${data.invoiceNumber}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = url;
        setPdfUrl(url);
      }
    } finally {
      setLoading(false);
    }
  }

  async function downloadReceipt() {
    setLoading(true);
    try {
      const res = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Receipt-${data.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  const comp = computeInvoice(data);
  const isPaid = comp.paid > 0 && comp.balance <= 0.005;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <span className="text-sm font-medium text-gray-500">
          {pdfUrl ? "Preview" : "Ready to generate"}
        </span>
        <div className="flex gap-2">
          {isPaid && (
            <button
              onClick={downloadReceipt}
              disabled={loading}
              className="px-4 py-2 rounded-full text-sm font-semibold border border-green-200 text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40"
            >
              🧾 Receipt
            </button>
          )}
          <button
            onClick={() => generatePDF(false)}
            disabled={loading}
            className="px-4 py-2 rounded-full text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            {loading ? "Loading…" : "↺ Refresh Preview"}
          </button>
          <button
            onClick={() => generatePDF(true)}
            disabled={loading}
            style={{ background: data.branding.primaryColor }}
            className="px-5 py-2 rounded-full text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity shadow-md"
          >
            ⬇ Download PDF
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 bg-gray-100 flex items-center justify-center">
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-none"
            title="Invoice Preview"
          />
        ) : (
          <div className="text-center text-gray-400 px-6">
            <div className="text-6xl mb-5">📄</div>
            <p className="text-sm font-semibold text-gray-500 mb-1">
              Fill in your details on the left
            </p>
            <p className="text-xs text-gray-400 mb-5">
              Then click the button below to see your document
            </p>
            <button
              onClick={() => generatePDF(false)}
              disabled={loading}
              style={{ background: data.branding.primaryColor }}
              className="px-6 py-2.5 rounded-full text-sm font-semibold text-white disabled:opacity-40 hover:opacity-90 transition-opacity shadow-md"
            >
              {loading ? "Generating…" : "Generate Preview"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
