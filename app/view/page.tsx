"use client";

import { useState, useEffect } from "react";
import type { InvoiceData } from "@/lib/types";
import { decodeInvoice } from "@/lib/share";
import { computeInvoice, fmt } from "@/lib/calculations";
import { getSymbol } from "@/lib/currencies";

export default function ViewPage() {
  const [data, setData] = useState<InvoiceData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      setNotFound(true);
      return;
    }
    const decoded = decodeInvoice(hash);
    if (!decoded) {
      setNotFound(true);
      return;
    }
    setData(decoded);

    // View tracking (same-browser): record the open timestamp.
    try {
      const key = `viewed_${decoded.id}`;
      const log = JSON.parse(localStorage.getItem(key) ?? "[]");
      log.push(new Date().toISOString());
      localStorage.setItem(key, JSON.stringify(log));
    } catch {
      /* ignore */
    }

    // Restore prior acceptance for this browser
    if (localStorage.getItem(`accepted_${decoded.id}`)) setAccepted(true);
  }, []);

  async function downloadPdf() {
    if (!data) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  function acceptQuote() {
    if (!data) return;
    localStorage.setItem(`accepted_${data.id}`, new Date().toISOString());
    setAccepted(true);
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="text-5xl mb-4">🔗</div>
          <p className="font-medium text-gray-600">Invalid or expired link</p>
          <p className="text-sm mt-1">This shared document could not be loaded.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">
        Loading…
      </div>
    );
  }

  const symbol = getSymbol(data.currency);
  const c = computeInvoice(data);
  const primary = data.branding.primaryColor;
  const isQuote = data.documentType === "quote";

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Action bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">{isQuote ? "Quote" : "Invoice"}</p>
            <p className="font-semibold text-gray-800">#{data.invoiceNumber}</p>
          </div>
          <div className="flex gap-2">
            {isQuote && (
              accepted ? (
                <span className="px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
                  ✓ Quote Accepted
                </span>
              ) : (
                <button
                  onClick={acceptQuote}
                  className="px-5 py-2 rounded-full bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors shadow-md"
                >
                  ✓ Accept Quote
                </button>
              )
            )}
            <button
              onClick={downloadPdf}
              disabled={downloading}
              style={{ background: primary }}
              className="px-5 py-2 rounded-full text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-md disabled:opacity-40"
            >
              {downloading ? "Generating…" : "⬇ Download PDF"}
            </button>
          </div>
        </div>

        {/* Document preview card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex justify-between items-start mb-8 pb-6" style={{ borderBottom: `2px solid ${primary}` }}>
            <div>
              <p className="text-2xl font-bold" style={{ color: primary }}>{data.business.name || "Your Business"}</p>
              <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{data.business.address}</p>
              <p className="text-sm text-gray-500">{data.business.email}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold uppercase" style={{ color: primary }}>{isQuote ? "Quote" : "Invoice"}</p>
              <p className="text-sm text-gray-500 mt-1">#{data.invoiceNumber}</p>
              {data.poNumber && <p className="text-sm text-gray-500">PO: {data.poNumber}</p>}
              <p className="text-sm text-gray-500">Issued: {data.issueDate}</p>
              {!isQuote && <p className="text-sm text-gray-500">Due: {data.dueDate}</p>}
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Bill To</p>
            <p className="font-medium text-gray-800">{data.client.name}</p>
            <p className="text-sm text-gray-500 whitespace-pre-line">{data.client.address}</p>
            <p className="text-sm text-gray-500">{data.client.email}</p>
          </div>

          {/* Line items */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr style={{ background: primary }} className="text-white">
                <th className="text-left py-2 px-3 rounded-l-lg font-medium">Description</th>
                <th className="text-right py-2 px-3 font-medium">Qty</th>
                <th className="text-right py-2 px-3 font-medium">Rate</th>
                <th className="text-right py-2 px-3 rounded-r-lg font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item, i) => (
                <tr key={item.id} className={i % 2 === 1 ? "bg-gray-50" : ""}>
                  <td className="py-2 px-3 text-gray-700">{item.description}</td>
                  <td className="py-2 px-3 text-right text-gray-700">{item.quantity}</td>
                  <td className="py-2 px-3 text-right text-gray-700">{fmt(item.rate, symbol)}</td>
                  <td className="py-2 px-3 text-right text-gray-700">{fmt(item.quantity * item.rate, symbol)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt(c.subtotal, symbol)}</span></div>
              {c.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>−{fmt(c.discount, symbol)}</span></div>}
              {data.taxRate > 0 && <div className="flex justify-between text-gray-500"><span>Tax ({data.taxRate}%)</span><span>{fmt(c.tax, symbol)}</span></div>}
              {c.lateFee > 0 && <div className="flex justify-between text-red-500"><span>Late Fee</span><span>{fmt(c.lateFee, symbol)}</span></div>}
              <div className="flex justify-between font-bold text-base rounded-lg px-3 py-2 mt-1" style={{ background: primary + "15", color: primary }}>
                <span>Total</span><span>{fmt(c.total, symbol)}</span>
              </div>
              {c.paid > 0 && (
                <>
                  <div className="flex justify-between text-green-600"><span>Paid</span><span>−{fmt(c.paid, symbol)}</span></div>
                  <div className="flex justify-between font-semibold" style={{ color: c.balance > 0 ? "#d97706" : "#16a34a" }}>
                    <span>Balance Due</span><span>{fmt(c.balance, symbol)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Pay now */}
          {data.paymentLink && (
            <div className="mt-6 text-right">
              <a
                href={data.paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: primary }}
                className="inline-block px-6 py-2.5 rounded-full text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-md"
              >
                Pay Now →
              </a>
            </div>
          )}

          {data.notes && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{data.notes}</p>
            </div>
          )}
          {data.terms && (
            <div className="mt-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Terms & Conditions</p>
              <p className="text-xs text-gray-500 whitespace-pre-line">{data.terms}</p>
            </div>
          )}
          {(data.signatureImage || data.signature) && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              {data.signatureImage && <img src={data.signatureImage} alt="signature" className="h-12 object-contain mb-1" />}
              <div className="w-48 border-b border-gray-300" />
              <p className="text-xs text-gray-400 mt-1">Authorised by{data.signature ? `: ${data.signature}` : ""}</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          {data.branding.footerText || "Thank you for your business!"}
        </p>
      </div>
    </div>
  );
}
