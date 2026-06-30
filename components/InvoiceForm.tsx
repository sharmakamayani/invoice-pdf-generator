"use client";

import { useState, useEffect } from "react";
import type { InvoiceData, DocumentType, Language, Project } from "@/lib/types";
import { loadProjects } from "@/lib/storage";
import { currencies, getSymbol } from "@/lib/currencies";
import { computeInvoice, fmt } from "@/lib/calculations";
import { paymentTerms, dueDateFromTerm } from "@/lib/paymentTerms";
import LineItems from "./LineItems";
import BrandingPanel from "./BrandingPanel";
import PaymentsPanel from "./PaymentsPanel";
import CurrencyConverter from "./CurrencyConverter";
import SignaturePad from "./SignaturePad";

interface Props {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
}

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
];

const STATUS_OPTIONS = [
  { value: "draft",   label: "Draft" },
  { value: "unpaid",  label: "Unpaid" },
  { value: "partial", label: "Partially Paid" },
  { value: "paid",    label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

export default function InvoiceForm({ data, onChange }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => { setProjects(loadProjects().filter((p) => !p.archived)); }, []);

  function set<K extends keyof InvoiceData>(key: K, value: InvoiceData[K]) {
    onChange({ ...data, [key]: value });
  }

  function setIssueDate(value: string) {
    // Recompute due date if a fixed payment term is active
    const due = dueDateFromTerm(value, data.paymentTerms);
    onChange({ ...data, issueDate: value, dueDate: due ?? data.dueDate });
  }

  function setPaymentTerms(value: string) {
    const due = dueDateFromTerm(data.issueDate, value);
    onChange({ ...data, paymentTerms: value, dueDate: due ?? data.dueDate });
  }

  const symbol = getSymbol(data.currency);
  const c = computeInvoice(data);
  const disc = data.discount ?? { type: "percentage" as const, value: 0 };

  const input =
    "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white transition-colors";
  const label = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";
  const section = "bg-white rounded-2xl border border-gray-100 p-5 shadow-sm";

  return (
    <div className="space-y-4">
      {/* Document type + number + dates */}
      <div className={section}>
        <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-4">
          {(["invoice", "quote"] as DocumentType[]).map((type) => (
            <button
              key={type}
              onClick={() => set("documentType", type)}
              className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-colors ${
                data.documentType === type ? "text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
              style={data.documentType === type ? { background: data.branding.primaryColor } : {}}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={label}>{data.documentType === "invoice" ? "Invoice" : "Quote"} #</label>
            <input className={input} value={data.invoiceNumber} onChange={(e) => set("invoiceNumber", e.target.value)} />
          </div>
          <div>
            <label className={label}>PO Number</label>
            <input
              className={input}
              placeholder="Optional"
              value={data.poNumber ?? ""}
              onChange={(e) => set("poNumber", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={label}>Issue Date</label>
            <input className={input} type="date" value={data.issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          {data.documentType === "invoice" && (
            <>
              <div>
                <label className={label}>Payment Terms</label>
                <select className={input} value={data.paymentTerms ?? "net30"} onChange={(e) => setPaymentTerms(e.target.value)}>
                  {paymentTerms.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Due Date</label>
                <input className={input} type="date" value={data.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
              </div>
            </>
          )}
        </div>

        {/* Status + Language */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className={label}>Payment Status</label>
            <select className={input} value={data.status ?? "draft"} onChange={(e) => set("status", e.target.value as InvoiceData["status"])}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Language</label>
            <select className={input} value={data.language ?? "en"} onChange={(e) => set("language", e.target.value as Language)}>
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>

        {projects.length > 0 && (
          <div className="mt-3">
            <label className={label}>Project (for budget tracking)</label>
            <select className={input} value={data.projectId ?? ""} onChange={(e) => set("projectId", e.target.value || undefined)}>
              <option value="">— None —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.clientName ? ` · ${p.clientName}` : ""}</option>
              ))}
            </select>
          </div>
        )}

        {/* Recurring */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => set("recurring", !data.recurring)}
            className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${data.recurring ? "bg-indigo-500" : "bg-gray-200"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${data.recurring ? "translate-x-5" : "translate-x-0"}`} />
          </button>
          <span className="text-sm text-gray-600">Recurring invoice</span>
          {data.recurring && (
            <select
              className="ml-auto border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white"
              value={data.recurringInterval ?? 30}
              onChange={(e) => set("recurringInterval", Number(e.target.value))}
            >
              <option value={7}>Weekly</option>
              <option value={14}>Bi-weekly</option>
              <option value={30}>Monthly</option>
              <option value={90}>Quarterly</option>
              <option value={365}>Yearly</option>
            </select>
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
                  onChange={(e) => onChange({ ...data, business: { ...data.business, [field]: e.target.value } })}
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
                  onChange={(e) => onChange({ ...data, client: { ...data.client, [field]: e.target.value } })}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className={section}>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Line Items</h3>
        <LineItems items={data.lineItems} currency={data.currency} onChange={(items) => set("lineItems", items)} />

        <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-gray-100">
          <div>
            <label className={label}>Currency</label>
            <select className={input} value={data.currency} onChange={(e) => set("currency", e.target.value)}>
              {currencies.map((cur) => (
                <option key={cur.code} value={cur.code}>{cur.code} — {cur.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Tax Rate (%)</label>
            <input className={input} type="number" min={0} max={100} step={0.1} value={data.taxRate} onChange={(e) => set("taxRate", Number(e.target.value))} />
          </div>
        </div>

        {/* Discount */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className={label}>Discount Type</label>
            <select className={input} value={disc.type} onChange={(e) => set("discount", { ...disc, type: e.target.value as "percentage" | "fixed" })}>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </div>
          <div>
            <label className={label}>Discount {disc.type === "percentage" ? "(%)" : `(${symbol})`}</label>
            <input className={input} type="number" min={0} step={disc.type === "percentage" ? 1 : 0.01} value={disc.value} onChange={(e) => set("discount", { ...disc, value: Number(e.target.value) })} />
          </div>
        </div>

        {/* Totals summary */}
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt(c.subtotal, symbol)}</span></div>
          {c.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>−{fmt(c.discount, symbol)}</span></div>}
          {data.taxRate > 0 && <div className="flex justify-between text-gray-500"><span>Tax ({data.taxRate}%)</span><span>{fmt(c.tax, symbol)}</span></div>}
          {c.lateFee > 0 && <div className="flex justify-between text-red-500"><span>Late Fee</span><span>{fmt(c.lateFee, symbol)}</span></div>}
          <div className="flex justify-between font-bold text-base rounded-lg px-3 py-2 mt-1" style={{ background: data.branding.primaryColor + "15", color: data.branding.primaryColor }}>
            <span>Total</span><span>{fmt(c.total, symbol)}</span>
          </div>
          {c.deposit > 0 && <div className="flex justify-between text-indigo-500 text-xs px-3"><span>Deposit due now</span><span>{fmt(c.deposit, symbol)}</span></div>}
          {c.paid > 0 && (
            <div className="flex justify-between text-xs px-3">
              <span className="text-green-600">Paid</span>
              <span className="text-green-600">−{fmt(c.paid, symbol)}</span>
            </div>
          )}
          {c.paid > 0 && (
            <div className="flex justify-between font-semibold px-3" style={{ color: c.balance > 0 ? "#d97706" : "#16a34a" }}>
              <span>Balance Due</span><span>{fmt(c.balance, symbol)}</span>
            </div>
          )}
        </div>

        {/* Currency converter */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <CurrencyConverter baseCurrency={data.currency} amount={c.total} />
        </div>
      </div>

      {/* Deposit + Late fee */}
      <div className={section}>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Deposit & Late Fee</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Deposit */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={data.deposit?.enabled ?? false}
                onChange={(e) => set("deposit", { ...(data.deposit ?? { type: "percentage", value: 50 }), enabled: e.target.checked })}
                className="w-4 h-4 accent-indigo-500"
              />
              <span className="text-sm font-medium text-gray-600">Require deposit</span>
            </div>
            {data.deposit?.enabled && (
              <div className="flex gap-2">
                <select
                  className={`${input} flex-1`}
                  value={data.deposit.type}
                  onChange={(e) => set("deposit", { ...data.deposit, type: e.target.value as "percentage" | "fixed" })}
                >
                  <option value="percentage">%</option>
                  <option value="fixed">{symbol}</option>
                </select>
                <input
                  className={`${input} flex-1`}
                  type="number"
                  min={0}
                  value={data.deposit.value}
                  onChange={(e) => set("deposit", { ...data.deposit, value: Number(e.target.value) })}
                />
              </div>
            )}
          </div>
          {/* Late fee */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={data.lateFee?.enabled ?? false}
                onChange={(e) => set("lateFee", { ...(data.lateFee ?? { type: "percentage", value: 5 }), enabled: e.target.checked })}
                className="w-4 h-4 accent-indigo-500"
              />
              <span className="text-sm font-medium text-gray-600">Late fee (if overdue)</span>
            </div>
            {data.lateFee?.enabled && (
              <div className="flex gap-2">
                <select
                  className={`${input} flex-1`}
                  value={data.lateFee.type}
                  onChange={(e) => set("lateFee", { ...data.lateFee, type: e.target.value as "percentage" | "fixed" })}
                >
                  <option value="percentage">%</option>
                  <option value="fixed">{symbol}</option>
                </select>
                <input
                  className={`${input} flex-1`}
                  type="number"
                  min={0}
                  value={data.lateFee.value}
                  onChange={(e) => set("lateFee", { ...data.lateFee, value: Number(e.target.value) })}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payments */}
      {data.documentType === "invoice" && (
        <div className={section}>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Payments Received</h3>
          <PaymentsPanel
            payments={data.payments ?? []}
            currency={data.currency}
            total={c.total}
            onChange={(payments) => set("payments", payments)}
          />
        </div>
      )}

      {/* Payment link */}
      <div className={section}>
        <label className={label}>Online Payment Link (Stripe / PayPal / Razorpay)</label>
        <input
          className={input}
          placeholder="https://buy.stripe.com/... — shows a 'Pay Now' button on the PDF"
          value={data.paymentLink ?? ""}
          onChange={(e) => set("paymentLink", e.target.value)}
        />
      </div>

      {/* Notes */}
      <div className={section}>
        <label className={label}>Notes / Payment Terms</label>
        <textarea
          className={`${input} min-h-[70px] resize-y`}
          placeholder="e.g. Payment due within 30 days. Bank transfer preferred."
          value={data.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>

      {/* Terms & Conditions */}
      <div className={section}>
        <label className={label}>Terms & Conditions (legal)</label>
        <textarea
          className={`${input} min-h-[70px] resize-y`}
          placeholder="e.g. Goods remain property of the seller until paid in full. Late payments subject to 5% monthly interest."
          value={data.terms ?? ""}
          onChange={(e) => set("terms", e.target.value)}
        />
      </div>

      {/* Signature */}
      <div className={section}>
        <label className={label}>Authorised By (signature name)</label>
        <input
          className={input}
          placeholder="e.g. Jane Smith — appears on PDF with a signature line"
          value={data.signature ?? ""}
          onChange={(e) => set("signature", e.target.value)}
        />
        <div className="mt-3">
          <label className={label}>E-signature (draw or type)</label>
          <SignaturePad value={data.signatureImage} onChange={(img) => set("signatureImage", img)} />
        </div>
      </div>

      {/* Branding */}
      <div className={section}>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Branding</h3>
        <BrandingPanel
          branding={data.branding}
          logo={data.business.logo}
          onChange={(branding) => set("branding", branding)}
          onLogoChange={(logo) => onChange({ ...data, business: { ...data.business, logo } })}
        />
      </div>
    </div>
  );
}
