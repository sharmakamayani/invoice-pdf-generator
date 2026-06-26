"use client";

import type { InvoiceData, DocumentType } from "@/lib/types";
import { currencies } from "@/lib/currencies";
import { calcSubtotal, calcTax, calcTotal, fmt } from "@/lib/calculations";
import { getSymbol } from "@/lib/currencies";
import LineItems from "./LineItems";
import BrandingPanel from "./BrandingPanel";

interface Props {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
}

export default function InvoiceForm({ data, onChange }: Props) {
  function set<K extends keyof InvoiceData>(key: K, value: InvoiceData[K]) {
    onChange({ ...data, [key]: value });
  }

  const symbol = getSymbol(data.currency);
  const subtotal = calcSubtotal(data.lineItems);
  const tax = calcTax(subtotal, data.taxRate);
  const total = calcTotal(subtotal, tax);

  const input =
    "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white transition-colors";
  const label = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";
  const section = "bg-white rounded-2xl border border-gray-100 p-5 shadow-sm";

  return (
    <div className="space-y-4">
      {/* Document type + number + dates */}
      <div className={section}>
        {/* Doc type toggle */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-4">
          {(["invoice", "quote"] as DocumentType[]).map((type) => (
            <button
              key={type}
              onClick={() => set("documentType", type)}
              className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-colors ${
                data.documentType === type
                  ? "text-white"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
              style={data.documentType === type ? { background: data.branding.primaryColor } : {}}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 md:col-span-1">
            <label className={label}>
              {data.documentType === "invoice" ? "Invoice" : "Quote"} #
            </label>
            <input
              className={input}
              value={data.invoiceNumber}
              onChange={(e) => set("invoiceNumber", e.target.value)}
            />
          </div>
          <div>
            <label className={label}>Issue Date</label>
            <input
              className={input}
              type="date"
              value={data.issueDate}
              onChange={(e) => set("issueDate", e.target.value)}
            />
          </div>
          {data.documentType === "invoice" && (
            <div>
              <label className={label}>Due Date</label>
              <input
                className={input}
                type="date"
                value={data.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Business + Client */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={section}>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Your Business</h3>
          <div className="space-y-2.5">
            {(["name", "address", "email", "phone"] as const).map((field) => (
              <div key={field}>
                <label className={label}>{field}</label>
                <input
                  className={input}
                  value={data.business[field]}
                  placeholder={field === "address" ? "123 Main St, City" : ""}
                  onChange={(e) =>
                    onChange({ ...data, business: { ...data.business, [field]: e.target.value } })
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div className={section}>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Client Details</h3>
          <div className="space-y-2.5">
            {(["name", "address", "email"] as const).map((field) => (
              <div key={field}>
                <label className={label}>{field}</label>
                <input
                  className={input}
                  value={data.client[field]}
                  onChange={(e) =>
                    onChange({ ...data, client: { ...data.client, [field]: e.target.value } })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className={section}>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Line Items</h3>
        <LineItems
          items={data.lineItems}
          currency={data.currency}
          onChange={(items) => set("lineItems", items)}
        />

        {/* Currency + Tax */}
        <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-gray-100">
          <div>
            <label className={label}>Currency</label>
            <select
              className={input}
              value={data.currency}
              onChange={(e) => set("currency", e.target.value)}
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Tax Rate (%)</label>
            <input
              className={input}
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={data.taxRate}
              onChange={(e) => set("taxRate", Number(e.target.value))}
            />
          </div>
        </div>

        {/* Totals summary */}
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>{fmt(subtotal, symbol)}</span>
          </div>
          {data.taxRate > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>Tax ({data.taxRate}%)</span>
              <span>{fmt(tax, symbol)}</span>
            </div>
          )}
          <div
            className="flex justify-between font-bold text-base rounded-lg px-3 py-2 mt-1"
            style={{ background: data.branding.primaryColor + "15", color: data.branding.primaryColor }}
          >
            <span>Total</span>
            <span>{fmt(total, symbol)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className={section}>
        <label className={label}>Notes / Payment Terms</label>
        <textarea
          className={`${input} min-h-[80px] resize-y`}
          placeholder="e.g. Payment due within 30 days. Bank transfer preferred."
          value={data.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>

      {/* Branding */}
      <div className={section}>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Branding</h3>
        <BrandingPanel
          branding={data.branding}
          logo={data.business.logo}
          onChange={(branding) => set("branding", branding)}
          onLogoChange={(logo) =>
            onChange({ ...data, business: { ...data.business, logo: logo } })
          }
        />
      </div>
    </div>
  );
}
