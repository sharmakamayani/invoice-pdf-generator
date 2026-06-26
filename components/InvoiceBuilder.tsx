"use client";

import { useState, useEffect } from "react";
import type { InvoiceData } from "@/lib/types";
import InvoiceForm from "./InvoiceForm";
import InvoicePreview from "./InvoicePreview";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function dueIn(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function nextInvoiceNumber(type: "invoice" | "quote"): string {
  const key = type === "invoice" ? "inv_counter" : "qte_counter";
  const n = parseInt(localStorage.getItem(key) ?? "0") + 1;
  localStorage.setItem(key, String(n));
  const prefix = type === "invoice" ? "INV" : "QTE";
  return `${prefix}-${String(n).padStart(3, "0")}`;
}

const defaults: InvoiceData = {
  documentType: "invoice",
  invoiceNumber: "INV-001",
  issueDate: today(),
  dueDate: dueIn(30),
  business: { name: "", address: "", email: "", phone: "", logo: undefined },
  client: { name: "", address: "", email: "" },
  lineItems: [{ id: crypto.randomUUID(), description: "", quantity: 1, rate: 0 }],
  taxRate: 0,
  currency: "USD",
  notes: "",
  branding: {
    primaryColor: "#4F46E5",
    font: "Helvetica",
    footerText: "Thank you for your business!",
  },
};

export default function InvoiceBuilder() {
  const [data, setData] = useState<InvoiceData>(defaults);

  useEffect(() => {
    const n = parseInt(localStorage.getItem("inv_counter") ?? "0") + 1;
    setData((prev) => ({ ...prev, invoiceNumber: `INV-${String(n).padStart(3, "0")}` }));
  }, []);

  const [showPreview, setShowPreview] = useState(false);

  function handleDocTypeChange(next: InvoiceData) {
    if (next.documentType !== data.documentType) {
      const num = nextInvoiceNumber(next.documentType);
      setData({ ...next, invoiceNumber: num });
    } else {
      setData(next);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: data.branding.primaryColor }}
            >
              IV
            </div>
            <span className="font-semibold text-gray-800">Invoice Generator</span>
          </div>

          {/* Mobile toggle */}
          <button
            className="lg:hidden text-sm font-medium px-4 py-2 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? "← Edit" : "Preview →"}
          </button>
        </div>
      </header>

      {/* Main split layout */}
      <div className="flex-1 max-w-screen-2xl mx-auto w-full flex">
        {/* Left: Form */}
        <div
          className={`w-full lg:w-[44%] lg:flex-shrink-0 overflow-y-auto p-4 lg:p-6 space-y-0 ${
            showPreview ? "hidden lg:block" : "block"
          }`}
          style={{ height: "calc(100vh - 57px)" }}
        >
          <InvoiceForm data={data} onChange={handleDocTypeChange} />
          <div className="h-8" />
        </div>

        {/* Right: Preview */}
        <div
          className={`flex-1 lg:flex-auto bg-gray-50 border-l border-gray-100 ${
            showPreview ? "block" : "hidden lg:block"
          }`}
          style={{ height: "calc(100vh - 57px)" }}
        >
          <InvoicePreview data={data} />
        </div>
      </div>
    </div>
  );
}
