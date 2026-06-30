"use client";

import { useState, useEffect } from "react";
import type { Expense, ExpenseCategory, Project } from "@/lib/types";
import { loadExpenses, saveExpense, deleteExpense, loadProjects } from "@/lib/storage";
import { currencies, getSymbol } from "@/lib/currencies";
import { fmt } from "@/lib/calculations";
import ReceiptScan from "./ReceiptScan";

const CATEGORIES: ExpenseCategory[] = ["software", "hardware", "travel", "meals", "office", "marketing", "subcontractor", "fees", "other"];

function today() { return new Date().toISOString().split("T")[0]; }
function blank(): Expense {
  return { id: "", date: today(), vendor: "", description: "", amount: 0, currency: "USD", category: "other", clientName: "", projectId: "", billable: false, createdAt: new Date().toISOString() };
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => { setExpenses(loadExpenses()); setProjects(loadProjects()); }, []);
  function refresh() { setExpenses(loadExpenses()); }

  function save() {
    if (!editing || !editing.vendor.trim() || editing.amount <= 0) return;
    saveExpense({ ...editing, id: editing.id || crypto.randomUUID() });
    setEditing(null);
    refresh();
  }
  function remove(id: string) {
    if (!confirm("Delete this expense?")) return;
    deleteExpense(id);
    refresh();
  }

  const input = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white";
  const label = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";

  // group totals by currency
  const totals: Record<string, number> = {};
  expenses.forEach((e) => { totals[e.currency] = (totals[e.currency] ?? 0) + e.amount; });

  return (
    <div className="space-y-4 p-1">
      {scanning && editing && (
        <ReceiptScan
          onClose={() => setScanning(false)}
          onApply={(r, image) => {
            setEditing((prev) => prev ? {
              ...prev,
              vendor: r.vendor || prev.vendor,
              amount: r.total > 0 ? r.total : prev.amount,
              date: r.date || prev.date,
              currency: r.currency && currencies.some((c) => c.code === r.currency.toUpperCase()) ? r.currency.toUpperCase() : prev.currency,
              category: (CATEGORIES.includes(r.category as ExpenseCategory) ? r.category : prev.category) as ExpenseCategory,
              receiptImage: image ?? prev.receiptImage,
            } : prev);
            setScanning(false);
          }}
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Expenses</h2>
        {!editing && (
          <button onClick={() => setEditing(blank())} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">+ New expense</button>
        )}
      </div>

      {Object.keys(totals).length > 0 && !editing && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(totals).map(([cur, amt]) => (
            <span key={cur} className="text-xs font-semibold bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full">
              {fmt(amt, getSymbol(cur))} {cur} total
            </span>
          ))}
        </div>
      )}

      {editing && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700">{editing.id ? "Edit" : "New"} expense</h3>
            <button onClick={() => setScanning(true)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">⎙ Scan receipt</button>
          </div>
          {editing.receiptImage && <img src={editing.receiptImage} alt="receipt" className="max-h-32 rounded-lg border border-gray-100" />}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Vendor</label><input className={input} value={editing.vendor} onChange={(e) => setEditing({ ...editing, vendor: e.target.value })} placeholder="e.g. Adobe" /></div>
            <div><label className={label}>Date</label><input className={input} type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></div>
            <div><label className={label}>Amount</label><input className={input} type="number" min={0} step={0.01} value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value) })} /></div>
            <div><label className={label}>Currency</label><select className={input} value={editing.currency} onChange={(e) => setEditing({ ...editing, currency: e.target.value })}>{currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}</select></div>
            <div><label className={label}>Category</label><select className={input} value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as ExpenseCategory })}>{CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}</select></div>
            <div><label className={label}>Client</label><input className={input} value={editing.clientName ?? ""} onChange={(e) => setEditing({ ...editing, clientName: e.target.value })} /></div>
            {projects.length > 0 && (
              <div className="col-span-2"><label className={label}>Project</label><select className={input} value={editing.projectId ?? ""} onChange={(e) => setEditing({ ...editing, projectId: e.target.value || undefined })}><option value="">— None —</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            )}
            <div className="col-span-2"><label className={label}>Description</label><input className={input} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={editing.billable} onChange={(e) => setEditing({ ...editing, billable: e.target.checked })} className="w-4 h-4 accent-indigo-500" />
            Billable to client
          </label>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="text-sm font-semibold px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={save} className="text-sm font-semibold px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Save</button>
          </div>
        </div>
      )}

      {expenses.length === 0 && !editing ? (
        <div className="flex flex-col items-center justify-center h-56 text-gray-400">
          <div className="text-5xl mb-4">🧾</div>
          <p className="font-medium text-gray-500">No expenses yet</p>
          <p className="text-sm mt-1">Add one manually or scan a receipt</p>
        </div>
      ) : (
        expenses.map((e) => (
          <div key={e.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {e.receiptImage && <img src={e.receiptImage} alt="" className="w-10 h-10 object-cover rounded-lg border border-gray-100 flex-shrink-0" />}
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{e.vendor} <span className="text-xs font-normal text-gray-400 capitalize">· {e.category}</span></p>
                <p className="text-xs text-gray-500 truncate">{e.date}{e.clientName ? ` · ${e.clientName}` : ""}{e.billable ? " · billable" : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-sm font-bold text-gray-700">{fmt(e.amount, getSymbol(e.currency))}</span>
              <button onClick={() => setEditing(e)} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Edit</button>
              <button onClick={() => remove(e.id)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
