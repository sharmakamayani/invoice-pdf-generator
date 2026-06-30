"use client";

import { useState, useEffect, useRef } from "react";
import type { TimeEntry, LineItem, Project } from "@/lib/types";
import { loadTimeEntries, saveTimeEntry, deleteTimeEntry, clearTimeEntries, loadProjects } from "@/lib/storage";

interface Props {
  onAddToInvoice: (items: LineItem[]) => void;
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function hoursFrom(seconds: number): number {
  return Math.round((seconds / 3600) * 100) / 100;
}

export default function TimerWidget({ onAddToInvoice }: Props) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [desc, setDesc] = useState("");
  const [rate, setRate] = useState(50);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const startRef = useRef<number>(0);
  const baseRef = useRef<number>(0);

  useEffect(() => {
    setEntries(loadTimeEntries());
    setProjects(loadProjects().filter((p) => !p.archived));
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setElapsed(baseRef.current + Math.floor((Date.now() - startRef.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  function start() {
    startRef.current = Date.now();
    baseRef.current = elapsed;
    setRunning(true);
  }

  function pause() {
    setRunning(false);
    setElapsed(baseRef.current + Math.floor((Date.now() - startRef.current) / 1000));
  }

  function stopAndSave() {
    setRunning(false);
    const finalElapsed = running
      ? baseRef.current + Math.floor((Date.now() - startRef.current) / 1000)
      : elapsed;
    if (finalElapsed < 1) return;
    const entry: TimeEntry = {
      id: crypto.randomUUID(),
      description: desc || "Billable time",
      seconds: finalElapsed,
      hourlyRate: rate,
      date: new Date().toISOString().split("T")[0],
      projectId: projectId || undefined,
    };
    saveTimeEntry(entry);
    setEntries(loadTimeEntries());
    setElapsed(0);
    setDesc("");
  }

  function removeEntry(id: string) {
    deleteTimeEntry(id);
    setEntries(loadTimeEntries());
  }

  function addAllToInvoice() {
    if (entries.length === 0) return;
    const items: LineItem[] = entries.map((e) => ({
      id: crypto.randomUUID(),
      description: `${e.description} (${hoursFrom(e.seconds)}h @ ${e.date})`,
      quantity: hoursFrom(e.seconds),
      rate: e.hourlyRate,
      category: "labour",
    }));
    onAddToInvoice(items);
    clearTimeEntries();
    setEntries([]);
  }

  const totalSeconds = entries.reduce((s, e) => s + e.seconds, 0);
  const totalValue = entries.reduce((s, e) => s + hoursFrom(e.seconds) * e.hourlyRate, 0);

  const input =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white";

  return (
    <div className="space-y-4 p-1">
      <h2 className="font-semibold text-gray-800">Time Tracker</h2>

      {/* Timer display */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center">
        <div className="text-5xl font-mono font-bold text-gray-800 tracking-tight mb-4">
          {fmtDuration(elapsed)}
        </div>
        <div className="flex justify-center gap-2">
          {!running ? (
            <button
              onClick={start}
              className="px-6 py-2.5 rounded-full bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors shadow-md"
            >
              ▶ Start
            </button>
          ) : (
            <button
              onClick={pause}
              className="px-6 py-2.5 rounded-full bg-yellow-500 text-white text-sm font-semibold hover:bg-yellow-600 transition-colors shadow-md"
            >
              ⏸ Pause
            </button>
          )}
          <button
            onClick={stopAndSave}
            disabled={elapsed < 1}
            className="px-6 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-40"
          >
            ⏹ Save Entry
          </button>
        </div>
      </div>

      {/* Entry details */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">What are you working on?</label>
          <input
            className={input}
            placeholder="e.g. Homepage redesign"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Hourly Rate</label>
          <input
            className={input}
            type="number"
            min={0}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
          />
        </div>
        {projects.length > 0 && (
          <div className="col-span-3">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Project</label>
            <select className={input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">— None —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Logged entries */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Logged Time ({entries.length})
          </h3>
          {entries.length > 0 && (
            <button
              onClick={addAllToInvoice}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              + Add all to invoice
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            No time logged yet. Start the timer and save entries to bill them.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700 truncate">{e.description}</p>
                    <p className="text-xs text-gray-400">
                      {e.date} · {hoursFrom(e.seconds)}h @ {e.hourlyRate}/h
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-mono text-gray-500">{fmtDuration(e.seconds)}</span>
                    <span className="text-sm font-semibold text-gray-700">
                      {(hoursFrom(e.seconds) * e.hourlyRate).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeEntry(e.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 pt-3 border-t border-gray-100 text-sm">
              <span className="font-semibold text-gray-600">
                Total: {fmtDuration(totalSeconds)}
              </span>
              <span className="font-bold text-indigo-600">{totalValue.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
