"use client";

import { useState, useEffect, useRef } from "react";
import type { ExtractedReceipt } from "@/lib/ocr";
import { scanReceipt } from "@/lib/ocr";
import { runTesseractReceipt } from "@/lib/tesseractOcr";
import { PROVIDERS, getProvider, loadSettings, saveSettings, type LLMProvider, type LLMSettings } from "@/lib/llmSettings";

interface Props {
  onApply: (r: ExtractedReceipt, image?: string) => void;
  onClose: () => void;
}

const ACCEPTED = "image/png,image/jpeg,image/jpg,image/webp,image/gif,application/pdf";

export default function ReceiptScan({ onApply, onClose }: Props) {
  const [settings, setSettings] = useState<LLMSettings>({ provider: "tesseract", apiKey: "", model: "" });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "error">("idle");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Default to Tesseract for receipts (free), but reuse a saved cloud key if present.
    const s = loadSettings();
    setSettings(s.apiKey ? s : { provider: "tesseract", apiKey: "", model: "" });
  }, []);

  const info = getProvider(settings.provider);
  const ready = info.needsKey ? settings.apiKey.trim().length > 0 : true;

  function changeProvider(id: LLMProvider) {
    const pInfo = getProvider(id);
    setSettings({ provider: id, apiKey: localStorage.getItem(`llm_key_${id}`) || "", model: localStorage.getItem(`llm_model_${id}`) || pInfo.defaultModel });
  }

  function pick(f: File | undefined) {
    if (!f) return;
    setFile(f); setStatus("idle"); setError("");
    if (f.type.startsWith("image/")) {
      const r = new FileReader();
      r.onload = () => setPreview(r.result as string);
      r.readAsDataURL(f);
    } else setPreview(null);
  }

  async function scan() {
    if (!file || !ready) return;
    if (info.needsKey) saveSettings(settings);
    setStatus("scanning"); setError(""); setProgress(null);
    try {
      let extracted: ExtractedReceipt;
      if (settings.provider === "tesseract") {
        const res = await runTesseractReceipt(file, (pct) => setProgress(pct));
        extracted = res.extracted;
      } else {
        extracted = await scanReceipt(file, settings);
      }
      onApply(extracted, preview ?? undefined);
      onClose();
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Scan failed.");
    } finally {
      setProgress(null);
    }
  }

  const input = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Scan a receipt</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {PROVIDERS.map((p) => (
            <button key={p.id} onClick={() => changeProvider(p.id)}
              className={`p-2 rounded-lg border-2 text-left transition-all ${settings.provider === p.id ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
              <p className="text-xs font-semibold text-gray-700 leading-tight">{p.label}</p>
              {p.free && <span className="text-[10px] text-emerald-600 font-medium">Free</span>}
            </button>
          ))}
        </div>

        {info.needsKey && (
          <input className={`${input} mb-3`} type="password" placeholder={info.keyHint} value={settings.apiKey}
            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })} onBlur={() => settings.apiKey && saveSettings(settings)} />
        )}

        <div className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors ${!ready ? "opacity-40 pointer-events-none" : "cursor-pointer"} border-gray-200 hover:border-indigo-300`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}>
          {preview ? <img src={preview} alt="" className="max-h-40 mx-auto rounded-lg" /> : file ? <p className="text-sm text-gray-700">📄 {file.name}</p> : <p className="text-sm text-gray-500">📤 Drop a receipt or click to browse</p>}
          <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </div>

        {status === "scanning" && progress != null && (
          <div className="mt-3"><div className="h-1.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${progress}%` }} /></div></div>
        )}
        {error && <div className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancel</button>
          <button onClick={scan} disabled={!file || !ready || status === "scanning"} className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40">
            {status === "scanning" ? "Reading…" : "Scan & Fill"}
          </button>
        </div>
      </div>
    </div>
  );
}
