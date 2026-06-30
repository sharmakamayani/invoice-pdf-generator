"use client";

import { useState, useEffect } from "react";
import type { InvoiceData, EmailLogEntry } from "@/lib/types";
import { loadInvoices, deleteInvoice, logEmail } from "@/lib/storage";
import { computeInvoice, isOverdue, fmt } from "@/lib/calculations";
import { getSymbol } from "@/lib/currencies";
import { buildShareUrl } from "@/lib/share";
import { exportInvoicesCSV } from "@/lib/exports";
import { useAuth } from "./AuthProvider";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  unpaid: "bg-yellow-100 text-yellow-700",
  partial: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  accepted: "bg-green-100 text-green-700",
};

interface Props {
  onLoad: (data: InvoiceData) => void;
}

export default function InvoiceHistory({ onLoad }: Props) {
  const { can } = useAuth();
  const canDelete = can("deleteRecords");
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [filter, setFilter] = useState<"all" | "unpaid" | "overdue" | "paid">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setInvoices(loadInvoices());
  }, []);

  function refresh() {
    setInvoices(loadInvoices());
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this invoice from history?")) return;
    deleteInvoice(id);
    setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
    refresh();
  }

  function toggleSelect(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function bulkDelete() {
    if (!confirm(`Delete ${selected.size} selected invoice(s)?`)) return;
    selected.forEach((id) => deleteInvoice(id));
    setSelected(new Set());
    refresh();
  }

  function bulkExport() {
    const chosen = invoices.filter((i) => selected.has(i.id));
    exportInvoicesCSV(chosen);
  }

  function bulkEmail() {
    const chosen = invoices.filter((i) => selected.has(i.id) && i.client?.email);
    if (chosen.length === 0) { alert("None of the selected invoices have a client email."); return; }
    // Open one mail draft per invoice (browser may limit rapid popups).
    chosen.forEach((inv) => {
      const subject = encodeURIComponent(`${inv.documentType === "invoice" ? "Invoice" : "Quote"} #${inv.invoiceNumber}`);
      const body = encodeURIComponent(`Hi ${inv.client.name || "there"},\n\nPlease find ${inv.documentType} #${inv.invoiceNumber}.\nView online: ${buildShareUrl(inv)}\n\nRegards,\n${inv.business?.name || ""}`);
      const cc = inv.business?.email ? `&cc=${encodeURIComponent(inv.business.email)}` : "";
      window.open(`mailto:${encodeURIComponent(inv.client.email)}?subject=${subject}${cc}&body=${body}`);
    });
  }

  function sendReminder(inv: InvoiceData) {
    const c = computeInvoice(inv);
    const symbol = getSymbol(inv.currency);
    const subject = encodeURIComponent(`Reminder: Invoice #${inv.invoiceNumber} — payment due`);
    const body = encodeURIComponent(
      `Hi ${inv.client?.name || "there"},\n\nThis is a friendly reminder that invoice #${inv.invoiceNumber} for ${symbol}${c.balance.toFixed(2)} ${
        isOverdue(inv) ? "is now overdue" : `is due on ${inv.dueDate}`
      }.\n\nView it online: ${buildShareUrl(inv)}\n\nThank you,\n${inv.business?.name || ""}`
    );
    const to = inv.client?.email ? encodeURIComponent(inv.client.email) : "";
    const cc = inv.business?.email ? `&cc=${encodeURIComponent(inv.business.email)}` : "";
    window.open(`mailto:${to}?subject=${subject}${cc}&body=${body}`);

    const entry: EmailLogEntry = {
      id: crypto.randomUUID(),
      invoiceNumber: inv.invoiceNumber,
      to: inv.client?.email ?? "",
      cc: inv.business?.email,
      subject: `Reminder: #${inv.invoiceNumber}`,
      sentAt: new Date().toISOString(),
      type: "reminder",
    };
    logEmail(entry);
  }

  const enriched = invoices.map((inv) => {
    const overdue = isOverdue(inv);
    const effStatus = overdue && inv.status !== "paid" ? "overdue" : inv.status ?? "draft";
    return { inv, overdue, effStatus, comp: computeInvoice(inv) };
  });

  const filtered = enriched.filter((e) => {
    if (filter === "all") return true;
    if (filter === "overdue") return e.overdue;
    if (filter === "unpaid") return e.effStatus === "unpaid" || e.effStatus === "partial" || e.overdue;
    if (filter === "paid") return e.inv.status === "paid";
    return true;
  });

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <div className="text-5xl mb-4">📄</div>
        <p className="font-medium text-gray-500">No saved invoices yet</p>
        <p className="text-sm mt-1">Save an invoice from the editor to see it here</p>
      </div>
    );
  }

  const overdueCount = enriched.filter((e) => e.overdue).length;

  return (
    <div className="space-y-3 p-1">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="font-semibold text-gray-800">Invoice History</h2>
        {overdueCount > 0 && (
          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
            ⚠ {overdueCount} overdue
          </span>
        )}
      </div>

      {/* Filters + bulk select */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex gap-2">
          {(["all", "unpaid", "overdue", "paid"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize transition-colors ${
                filter === f ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((e) => e.inv.id)))}
          className="text-xs font-semibold text-indigo-500 hover:text-indigo-700"
        >
          {selected.size === filtered.length && filtered.length > 0 ? "Clear selection" : "Select all"}
        </button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex items-center justify-between bg-indigo-600 text-white rounded-xl px-4 py-2.5 shadow-md">
          <span className="text-sm font-semibold">{selected.size} selected</span>
          <div className="flex gap-2">
            <button onClick={bulkExport} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">⬇ Export CSV</button>
            <button onClick={bulkEmail} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">✉ Email</button>
            {canDelete && <button onClick={bulkDelete} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 transition-colors">🗑 Delete</button>}
          </div>
        </div>
      )}

      {filtered.map(({ inv, overdue, effStatus, comp }) => (
        <div
          key={inv.id}
          className={`bg-white rounded-xl border p-4 shadow-sm transition-colors ${
            selected.has(inv.id) ? "border-indigo-400 ring-1 ring-indigo-100" : overdue ? "border-red-200" : "border-gray-100 hover:border-indigo-200"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <input
              type="checkbox"
              checked={selected.has(inv.id)}
              onChange={() => toggleSelect(inv.id)}
              className="mt-1 w-4 h-4 accent-indigo-500 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-800 text-sm">
                  {inv.documentType === "invoice" ? "INV" : "QTE"} #{inv.invoiceNumber}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[effStatus]}`}>
                  {effStatus}
                </span>
                {inv.recurring && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">Recurring</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1 truncate">
                {inv.client?.name || "No client"} — {inv.issueDate}
                {inv.documentType === "invoice" && ` · due ${inv.dueDate}`}
              </p>
              <p className="text-sm font-semibold text-gray-700 mt-1">
                {fmt(comp.total, getSymbol(inv.currency))}
                {comp.balance > 0 && comp.balance < comp.total && (
                  <span className="text-xs text-amber-600 ml-2">
                    {fmt(comp.balance, getSymbol(inv.currency))} due
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <div className="flex gap-2">
                <button onClick={() => onLoad(inv)} className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-medium transition-colors">Load</button>
                {canDelete && <button onClick={() => handleDelete(inv.id)} className="text-xs px-3 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 font-medium transition-colors">Delete</button>}
              </div>
              {inv.documentType === "invoice" && inv.status !== "paid" && (
                <button onClick={() => sendReminder(inv)} className="text-xs px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 font-medium transition-colors">
                  Send reminder
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
