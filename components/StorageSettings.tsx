"use client";

import { useState, useEffect, useRef } from "react";
import {
  fileApiAvailable,
  getBackend,
  setBackend,
  chooseFile,
  connectedFileName,
  writeToFile,
  readFromFile,
  disconnectFile,
  exportJson,
  importJson,
  type Backend,
} from "@/lib/fileSync";
import {
  getWebhookConfig,
  saveWebhookConfig,
  sendWebhook,
  testPayload,
  type WebhookConfig,
} from "@/lib/webhook";
import type { PaymentStatus } from "@/lib/types";

interface Props {
  onClose: () => void;
  onReload: () => void; // re-read data into the UI (full reload)
}

export default function StorageSettings({ onClose, onReload }: Props) {
  const [backend, setBackendState] = useState<Backend>("local");
  const [fileName, setFileName] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const available = fileApiAvailable();

  const [hook, setHook] = useState<WebhookConfig>({ enabled: false, url: "", triggers: ["paid"] });
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setBackendState(getBackend());
    connectedFileName().then(setFileName);
    setHook(getWebhookConfig());
  }, []);

  const TRIGGER_OPTIONS: PaymentStatus[] = ["paid", "accepted", "overdue", "partial", "unpaid"];

  function updateHook(next: WebhookConfig) {
    setHook(next);
    saveWebhookConfig(next);
  }
  function toggleTrigger(s: PaymentStatus) {
    const has = hook.triggers.includes(s);
    const triggers = has ? hook.triggers.filter((t) => t !== s) : [...hook.triggers, s];
    updateHook({ ...hook, triggers: triggers.length ? triggers : ["paid"] });
  }
  async function testHook() {
    if (!hook.url.trim()) { fail(new Error("Enter a webhook URL first.")); return; }
    setTesting(true);
    try { await sendWebhook(hook.url.trim(), testPayload()); flash("Test webhook delivered ✓"); }
    catch (e) { fail(e); }
    finally { setTesting(false); }
  }

  function flash(m: string) {
    setMsg(m);
    setError("");
    setTimeout(() => setMsg(""), 2500);
  }
  function fail(e: unknown) {
    setError(e instanceof Error ? e.message : "Something went wrong.");
  }

  async function useLocal() {
    setBackend("local");
    setBackendState("local");
    flash("Now storing in this browser.");
  }

  async function connect(mode: "create" | "open") {
    try {
      const name = await chooseFile(mode);
      setFileName(name);
      setBackend("file");
      setBackendState("file");
      if (mode === "create") {
        await writeToFile(); // seed the new file with current data
        flash(`Connected & saved to ${name}.`);
      } else {
        await readFromFile(); // load the chosen file's data
        flash(`Connected to ${name}. Loaded its data.`);
        onReload();
      }
    } catch (e) {
      // AbortError = user cancelled the picker; ignore
      if (e instanceof DOMException && e.name === "AbortError") return;
      fail(e);
    }
  }

  async function saveNow() {
    try { await writeToFile(); flash("Saved to file."); } catch (e) { fail(e); }
  }
  async function loadNow() {
    try { const ok = await readFromFile(); if (ok) { flash("Loaded from file."); onReload(); } else fail(new Error("Nothing to load.")); }
    catch (e) { fail(e); }
  }
  async function disconnect() {
    await disconnectFile();
    setFileName(null);
    setBackendState("local");
    flash("Disconnected. Now storing in this browser.");
  }

  async function onImport(file: File | undefined) {
    if (!file) return;
    try { await importJson(file); flash("Backup imported."); onReload(); }
    catch (e) { fail(e); }
  }

  const card = "rounded-xl border-2 p-4 text-left transition-all w-full";
  const btn = "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">Settings</h2>
            <p className="text-xs text-gray-500 mt-0.5">Data storage, backup & integrations.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Browser option */}
        <button
          onClick={useLocal}
          className={`${card} mb-3 ${backend === "local" ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-gray-300 bg-white"}`}
        >
          <p className="text-sm font-semibold text-gray-700">🖥️ This browser (default)</p>
          <p className="text-xs text-gray-500 mt-1">Works in every browser. Data stays on this device — clearing browser data erases it.</p>
        </button>

        {/* Local file option */}
        <div className={`${card} ${backend === "file" ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-white"}`}>
          <p className="text-sm font-semibold text-gray-700">📁 A file on your drive {!available && <span className="text-amber-600 font-normal">(needs Chrome/Edge)</span>}</p>
          <p className="text-xs text-gray-500 mt-1">
            Saves a real <code>invoices.json</code> you own. Put it in a Dropbox/Drive/OneDrive folder for automatic backup & multi-device sync — no account needed.
          </p>

          {available ? (
            <div className="mt-3">
              {fileName ? (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs text-gray-600">Connected: <span className="font-medium">{fileName}</span></span>
                  <div className="flex gap-2">
                    <button onClick={saveNow} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>Save now</button>
                    <button onClick={loadNow} className={`${btn} bg-gray-100 text-gray-600 hover:bg-gray-200`}>Load</button>
                    <button onClick={disconnect} className={`${btn} bg-red-50 text-red-500 hover:bg-red-100`}>Disconnect</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => connect("create")} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}>Create new file…</button>
                  <button onClick={() => connect("open")} className={`${btn} bg-gray-100 text-gray-600 hover:bg-gray-200`}>Open existing…</button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-amber-600 mt-2">Your browser doesn&apos;t support writing to disk. Use Chrome or Edge, or use Export/Import below to back up.</p>
          )}
        </div>

        {/* Universal backup */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Backup (works everywhere)</p>
          <div className="flex gap-2">
            <button onClick={() => { exportJson(); flash("Backup downloaded."); }} className={`${btn} bg-gray-100 text-gray-600 hover:bg-gray-200`}>⬇ Export JSON</button>
            <button onClick={() => importRef.current?.click()} className={`${btn} bg-gray-100 text-gray-600 hover:bg-gray-200`}>⬆ Import JSON</button>
            <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onImport(e.target.files?.[0])} />
          </div>
        </div>

        {/* Webhook / integrations */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Webhook (Zapier, CRM, automations)</p>
            <button
              onClick={() => updateHook({ ...hook, enabled: !hook.enabled })}
              className={`relative w-10 h-5 rounded-full transition-colors ${hook.enabled ? "bg-indigo-500" : "bg-gray-200"}`}
              aria-label="Toggle webhook"
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${hook.enabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-2">POSTs a JSON payload to your URL when an invoice&apos;s status changes (e.g. marked Paid).</p>

          <div className="flex gap-2">
            <input
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white"
              placeholder="https://hooks.zapier.com/hooks/catch/…"
              value={hook.url}
              onChange={(e) => setHook({ ...hook, url: e.target.value })}
              onBlur={() => saveWebhookConfig(hook)}
            />
            <button onClick={testHook} disabled={testing} className={`${btn} bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 whitespace-nowrap`}>
              {testing ? "Sending…" : "Send test"}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-3 mb-1.5">Fire when status becomes:</p>
          <div className="flex flex-wrap gap-1.5">
            {TRIGGER_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => toggleTrigger(s)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize transition-colors ${
                  hook.triggers.includes(s) ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {msg && <div className="mt-3 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">{msg}</div>}
        {error && <div className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

        <p className="text-[11px] text-gray-400 mt-4 leading-snug">
          🔒 Your data never leaves your device — the file lives on your own drive (and your own cloud folder if you choose one). API keys and webhook URLs are not included in the data file.
        </p>
      </div>
    </div>
  );
}
