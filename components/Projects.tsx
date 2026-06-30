"use client";

import { useState, useEffect } from "react";
import type { Project } from "@/lib/types";
import { loadProjects, saveProject, deleteProject } from "@/lib/storage";
import { projectStats } from "@/lib/projectStats";
import { getSymbol, currencies } from "@/lib/currencies";
import { fmt } from "@/lib/calculations";

function blank(): Project {
  return { id: "", name: "", clientName: "", budget: 0, currency: "USD", archived: false, createdAt: new Date().toISOString() };
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Project | null>(null);

  useEffect(() => { setProjects(loadProjects()); }, []);
  function refresh() { setProjects(loadProjects()); }

  function save() {
    if (!editing || !editing.name.trim()) return;
    saveProject({ ...editing, id: editing.id || crypto.randomUUID() });
    setEditing(null);
    refresh();
  }
  function remove(id: string) {
    if (!confirm("Delete this project? Linked invoices/time/expenses are kept but unlinked.")) return;
    deleteProject(id);
    refresh();
  }

  const input = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white";
  const label = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Projects</h2>
        {!editing && (
          <button onClick={() => setEditing(blank())} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">+ New project</button>
        )}
      </div>

      {editing && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={label}>Project name</label>
              <input className={input} autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Acme website redesign" />
            </div>
            <div>
              <label className={label}>Client</label>
              <input className={input} value={editing.clientName} onChange={(e) => setEditing({ ...editing, clientName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label}>Budget</label>
                <input className={input} type="number" min={0} value={editing.budget} onChange={(e) => setEditing({ ...editing, budget: Number(e.target.value) })} />
              </div>
              <div>
                <label className={label}>Currency</label>
                <select className={input} value={editing.currency} onChange={(e) => setEditing({ ...editing, currency: e.target.value })}>
                  {currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="text-sm font-semibold px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={save} className="text-sm font-semibold px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Save</button>
          </div>
        </div>
      )}

      {projects.length === 0 && !editing ? (
        <div className="flex flex-col items-center justify-center h-56 text-gray-400">
          <div className="text-5xl mb-4">📁</div>
          <p className="font-medium text-gray-500">No projects yet</p>
          <p className="text-sm mt-1">Create a project to track budget, time & expenses together</p>
        </div>
      ) : (
        projects.map((p) => {
          const s = projectStats(p);
          const symbol = getSymbol(p.currency);
          const pct = Math.min(100, Math.round(s.pctUsed * 100));
          return (
            <div key={p.id} className={`bg-white rounded-2xl border p-5 shadow-sm ${s.overBudget ? "border-red-200" : "border-gray-100"}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.clientName || "No client"} · {s.invoiceCount} invoice{s.invoiceCount === 1 ? "" : "s"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {s.overBudget && <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">⚠ Over budget</span>}
                  <button onClick={() => setEditing(p)} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Edit</button>
                  <button onClick={() => remove(p.id)} className="text-xs px-2.5 py-1 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">Delete</button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center mb-3">
                <div><p className="text-xs text-gray-400">Budget</p><p className="text-sm font-bold text-gray-700">{fmt(p.budget, symbol)}</p></div>
                <div><p className="text-xs text-gray-400">Invoiced</p><p className="text-sm font-bold text-indigo-600">{fmt(s.invoiced, symbol)}</p></div>
                <div><p className="text-xs text-gray-400">Cost (time+exp)</p><p className="text-sm font-bold text-amber-600">{fmt(s.cost, symbol)}</p></div>
                <div><p className="text-xs text-gray-400">Remaining</p><p className={`text-sm font-bold ${s.remaining < 0 ? "text-red-600" : "text-green-600"}`}>{fmt(s.remaining, symbol)}</p></div>
              </div>

              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.overBudget ? "#dc2626" : "#4F46E5" }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{pct}% of budget used (cost vs budget)</p>
            </div>
          );
        })
      )}
    </div>
  );
}
