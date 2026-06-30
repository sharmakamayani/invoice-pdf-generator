"use client";

import { useState, useRef, useEffect } from "react";
import type { InvoiceData } from "@/lib/types";
import { scanInvoice, applyExtraction } from "@/lib/ocr";
import { runTesseract } from "@/lib/tesseractOcr";
import {
  PROVIDERS,
  getProvider,
  loadSettings,
  saveSettings,
  type LLMProvider,
  type LLMSettings,
} from "@/lib/llmSettings";

interface Props {
  current: InvoiceData;
  onApply: (data: InvoiceData) => void;
  onClose: () => void;
}

const ACCEPTED = "image/png,image/jpeg,image/jpg,image/webp,image/gif,application/pdf";

export default function ImportInvoice({ current, onApply, onClose }: Props) {
  const [settings, setSettings] = useState<LLMSettings>({ provider: "anthropic", apiKey: "", model: "claude-opus-4-8" });
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState<{ pct: number; stage: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const info = getProvider(settings.provider);
  const hasKey = settings.apiKey.trim().length > 0;
  const ready = info.needsKey ? hasKey : true;

  function changeProvider(id: LLMProvider) {
    // Switching providers loads that provider's saved key/model (if any)
    const pInfo = getProvider(id);
    setSettings({
      provider: id,
      apiKey: localStorage.getItem(`llm_key_${id}`) || "",
      model: localStorage.getItem(`llm_model_${id}`) || pInfo.defaultModel,
    });
    setKeySaved(false);
  }

  function persist(next: LLMSettings) {
    setSettings(next);
    saveSettings(next);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 1500);
  }

  function pickFile(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setStatus("idle");
    setError("");
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  async function handleScan() {
    if (!file || !ready) return;
    saveSettings(settings);
    setStatus("scanning");
    setError("");
    setProgress(null);
    try {
      let extracted;
      if (settings.provider === "tesseract") {
        const result = await runTesseract(file, (pct, stage) => setProgress({ pct, stage }));
        extracted = result.extracted;
      } else {
        extracted = await scanInvoice(file, settings);
      }
      onApply(applyExtraction(current, extracted));
      setStatus("done");
      setTimeout(onClose, 600);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Extraction failed.");
    } finally {
      setProgress(null);
    }
  }

  const inputCls =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">Scan an Invoice</h2>
            <p className="text-xs text-gray-500 mt-0.5">Upload a photo, scan, or PDF — AI reads it into the form.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* ── Step 1: provider (prerequisite for cloud providers) ─────── */}
        <div className="rounded-xl border border-gray-200 p-4 mb-4 bg-gray-50">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">1</span>
            <span className="text-sm font-semibold text-gray-700">Choose how to read the invoice</span>
          </div>

          {/* Provider buttons */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => changeProvider(p.id)}
                className={`relative p-2.5 rounded-lg border-2 text-left transition-all ${
                  settings.provider === p.id ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <p className="text-xs font-semibold text-gray-700 leading-tight">{p.label}</p>
                {p.recommended && <span className="text-[10px] text-indigo-500 font-medium">Best accuracy</span>}
                {p.free && <span className="text-[10px] text-emerald-600 font-medium">No key needed</span>}
              </button>
            ))}
          </div>

          {info.needsKey ? (
            <>
              {/* API key */}
              <label className="block text-xs font-semibold text-gray-500 mb-1">API Key</label>
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  type={showKey ? "text" : "password"}
                  placeholder={info.keyHint}
                  value={settings.apiKey}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  onBlur={() => settings.apiKey && persist(settings)}
                />
                <button
                  onClick={() => setShowKey((v) => !v)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-100 transition-colors whitespace-nowrap"
                >
                  {showKey ? "Hide" : "Show"}
                </button>
              </div>

              {/* Optional model override */}
              <div className="mt-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Model <span className="font-normal text-gray-400">(optional)</span></label>
                <input
                  className={inputCls}
                  placeholder={info.defaultModel}
                  value={settings.model}
                  onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                  onBlur={() => persist(settings)}
                />
              </div>

              <div className="flex items-center justify-between mt-2">
                <a href={info.keysUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:text-indigo-700">
                  Get a {info.label.split(" ")[0]} key →
                </a>
                {keySaved && <span className="text-xs text-green-600 font-medium">✓ Saved in this browser</span>}
              </div>
              <p className="text-[11px] text-gray-400 mt-2 leading-snug">
                🔒 Your key is stored only in this browser (localStorage) and sent directly to your chosen provider. It is never saved to the project or shared.
              </p>
            </>
          ) : (
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2.5">
              <p className="text-xs font-semibold text-emerald-700">✓ Runs free, entirely in your browser</p>
              <p className="text-[11px] text-emerald-600 mt-1 leading-snug">
                No API key, no cost, works offline. Reads the text on the image and fills fields using built-in rules. Best for clean, typed invoices — review the results, as this is less accurate than the AI options on messy photos.
              </p>
            </div>
          )}
        </div>

        {/* ── Step 2: Upload ─────────────────────────────────────────── */}
        <div className={`flex items-center gap-2 mb-3 ${ready ? "" : "opacity-40"}`}>
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">2</span>
          <span className="text-sm font-semibold text-gray-700">Upload the invoice</span>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${!ready ? "opacity-40 pointer-events-none" : "cursor-pointer"} ${
            dragActive ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-indigo-300"
          }`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); pickFile(e.dataTransfer.files?.[0]); }}
        >
          {preview ? (
            <img src={preview} alt="preview" className="max-h-44 mx-auto rounded-lg shadow-sm" />
          ) : file ? (
            <div className="py-3"><div className="text-4xl mb-2">📄</div><p className="text-sm font-medium text-gray-700">{file.name}</p></div>
          ) : (
            <div className="py-3">
              <div className="text-4xl mb-2">📤</div>
              <p className="text-sm font-medium text-gray-600">Drop an invoice here or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG, WebP{info.supportsPdf ? " or PDF" : " (PDF needs Claude or Gemini)"}
              </p>
            </div>
          )}
          <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
        </div>

        {/* Tesseract progress */}
        {status === "scanning" && progress && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span className="capitalize">{progress.stage || "Reading"}…</span>
              <span>{progress.pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress.pct}%` }} />
            </div>
          </div>
        )}

        {error && <div className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
        {status === "done" && <div className="mt-3 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">✓ Extracted! Filling the form…</div>}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
          <button
            onClick={handleScan}
            disabled={!file || !ready || status === "scanning"}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-40"
            title={!ready ? "Enter an API key first" : !file ? "Upload a file first" : ""}
          >
            {status === "scanning" ? "Reading…" : "Scan & Fill Form"}
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Tip: a straight, well-lit photo or a native PDF reads most accurately. Always review the filled fields — especially totals — before sending.
        </p>
      </div>
    </div>
  );
}
