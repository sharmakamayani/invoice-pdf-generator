"use client";

import { useState, useEffect, useMemo } from "react";
import type { InvoiceData } from "@/lib/types";
import { loadInvoices, loadExpenses } from "@/lib/storage";
import { computeInvoice, isOverdue, fmt } from "@/lib/calculations";
import { getSymbol } from "@/lib/currencies";
import { exportInvoicesCSV, downloadTaxReport } from "@/lib/exports";

interface Props {
  dark?: boolean;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Dashboard({ dark }: Props) {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [expenseTotal, setExpenseTotal] = useState(0);

  useEffect(() => {
    setInvoices(loadInvoices());
  }, []);

  // Use the most common currency for display
  const displayCurrency = useMemo(() => {
    if (!invoices.length) return "USD";
    const counts: Record<string, number> = {};
    invoices.forEach((i) => (counts[i.currency] = (counts[i.currency] ?? 0) + 1));
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }, [invoices]);

  const symbol = getSymbol(displayCurrency);

  useEffect(() => {
    const exp = loadExpenses().filter((e) => e.currency === displayCurrency);
    setExpenseTotal(exp.reduce((s, e) => s + e.amount, 0));
  }, [displayCurrency]);

  const stats = useMemo(() => {
    const inv = invoices.filter((i) => i.documentType === "invoice");
    let billed = 0, paid = 0, outstanding = 0, overdue = 0, taxCollected = 0;
    const aging = { current: 0, d30: 0, d60: 0, d90: 0 };
    const byClient: Record<string, { billed: number; paid: number; count: number }> = {};

    inv.forEach((i) => {
      const c = computeInvoice(i);
      billed += c.total;
      paid += c.paid;
      taxCollected += c.tax;
      const bal = c.balance;
      if (i.status !== "paid") outstanding += bal;
      if (isOverdue(i)) {
        overdue += bal;
        const od = daysBetween(new Date(), new Date(i.dueDate));
        if (od <= 30) aging.d30 += bal;
        else if (od <= 60) aging.d60 += bal;
        else aging.d90 += bal;
      } else if (i.status !== "paid") {
        aging.current += bal;
      }
      const name = i.client?.name || "Unspecified";
      if (!byClient[name]) byClient[name] = { billed: 0, paid: 0, count: 0 };
      byClient[name].billed += c.total;
      byClient[name].paid += c.paid;
      byClient[name].count += 1;
    });

    const clients = Object.entries(byClient)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.billed - a.billed);

    return { billed, paid, outstanding, overdue, taxCollected, aging, clients, count: inv.length };
  }, [invoices]);

  const cardBg = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100";
  const textMain = dark ? "text-gray-100" : "text-gray-800";
  const textSub = dark ? "text-gray-400" : "text-gray-500";

  const cards = [
    { label: "Total Billed", value: stats.billed, color: "#4F46E5", icon: "📊" },
    { label: "Total Paid", value: stats.paid, color: "#16a34a", icon: "✓" },
    { label: "Outstanding", value: stats.outstanding, color: "#d97706", icon: "⏳" },
    { label: "Overdue", value: stats.overdue, color: "#dc2626", icon: "⚠" },
  ];

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <div className="text-5xl mb-4">📊</div>
        <p className={`font-medium ${textSub}`}>No data yet</p>
        <p className="text-sm mt-1">Save some invoices to see your revenue dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className={`font-semibold ${textMain}`}>Revenue Dashboard</h2>
        <div className="flex gap-2">
          <button
            onClick={() => exportInvoicesCSV(invoices)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
          >
            ⬇ Export CSV
          </button>
          <button
            onClick={() => downloadTaxReport(invoices, displayCurrency)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
          >
            ⬇ Tax Report PDF
          </button>
        </div>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-2xl border p-4 shadow-sm ${cardBg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold uppercase tracking-wide ${textSub}`}>{c.label}</span>
              <span style={{ color: c.color }}>{c.icon}</span>
            </div>
            <p className="text-xl font-bold" style={{ color: c.color }}>
              {fmt(c.value, symbol)}
            </p>
          </div>
        ))}
      </div>

      {/* Aged receivables */}
      <div className={`rounded-2xl border p-5 shadow-sm ${cardBg}`}>
        <h3 className={`text-sm font-semibold mb-4 ${textMain}`}>Aged Receivables</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Current", value: stats.aging.current, color: "#16a34a" },
            { label: "1–30 days", value: stats.aging.d30, color: "#d97706" },
            { label: "31–60 days", value: stats.aging.d60, color: "#ea580c" },
            { label: "60+ days", value: stats.aging.d90, color: "#dc2626" },
          ].map((b) => (
            <div key={b.label} className="text-center">
              <p className="text-sm font-bold" style={{ color: b.color }}>{fmt(b.value, symbol)}</p>
              <p className={`text-xs mt-1 ${textSub}`}>{b.label}</p>
            </div>
          ))}
        </div>
        {/* Bar */}
        <div className="flex h-2 rounded-full overflow-hidden mt-4 bg-gray-100">
          {[
            { value: stats.aging.current, color: "#16a34a" },
            { value: stats.aging.d30, color: "#d97706" },
            { value: stats.aging.d60, color: "#ea580c" },
            { value: stats.aging.d90, color: "#dc2626" },
          ].map((b, i) => {
            const totalOut = stats.aging.current + stats.aging.d30 + stats.aging.d60 + stats.aging.d90 || 1;
            return <div key={i} style={{ width: `${(b.value / totalOut) * 100}%`, background: b.color }} />;
          })}
        </div>
      </div>

      {/* Two columns: client revenue + tax summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Client revenue */}
        <div className={`rounded-2xl border p-5 shadow-sm ${cardBg}`}>
          <h3 className={`text-sm font-semibold mb-4 ${textMain}`}>Revenue by Client</h3>
          <div className="space-y-3">
            {stats.clients.slice(0, 6).map((c) => {
              const pct = stats.billed ? (c.billed / stats.billed) * 100 : 0;
              return (
                <div key={c.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={textMain}>{c.name}</span>
                    <span className={textSub}>{fmt(c.billed, symbol)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#4F46E5" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tax summary */}
        <div className={`rounded-2xl border p-5 shadow-sm ${cardBg}`}>
          <h3 className={`text-sm font-semibold mb-4 ${textMain}`}>Tax Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className={`text-sm ${textSub}`}>Total Invoices</span>
              <span className={`text-sm font-semibold ${textMain}`}>{stats.count}</span>
            </div>
            <div className="flex justify-between">
              <span className={`text-sm ${textSub}`}>Net Billed (pre-tax)</span>
              <span className={`text-sm font-semibold ${textMain}`}>{fmt(stats.billed - stats.taxCollected, symbol)}</span>
            </div>
            <div className="flex justify-between">
              <span className={`text-sm ${textSub}`}>Tax Collected</span>
              <span className="text-sm font-bold text-indigo-600">{fmt(stats.taxCollected, symbol)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-3">
              <span className={`text-sm ${textSub}`}>Expenses</span>
              <span className="text-sm font-semibold text-amber-600">−{fmt(expenseTotal, symbol)}</span>
            </div>
            <div className="flex justify-between">
              <span className={`text-sm font-semibold ${textMain}`}>Net Profit (paid − expenses)</span>
              <span className="text-sm font-bold" style={{ color: stats.paid - expenseTotal >= 0 ? "#16a34a" : "#dc2626" }}>
                {fmt(stats.paid - expenseTotal, symbol)}
              </span>
            </div>
            <p className={`text-xs ${textSub} pt-2`}>
              Export the Tax Report PDF above to hand to your accountant.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
