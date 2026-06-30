"use client";

import { useRef } from "react";
import type { BrandingConfig, FontFamily, TemplateType, WatermarkType } from "@/lib/types";

interface Props {
  branding: BrandingConfig;
  logo?: string;
  onChange: (branding: BrandingConfig) => void;
  onLogoChange: (dataUrl: string | undefined) => void;
}

const fonts: { value: FontFamily; label: string }[] = [
  { value: "Helvetica",   label: "Helvetica (Modern)" },
  { value: "Times-Roman", label: "Times Roman (Classic)" },
  { value: "Courier",     label: "Courier (Technical)" },
];

const templates: { value: TemplateType; label: string; desc: string }[] = [
  { value: "modern",    label: "Modern",    desc: "Colour header & totals" },
  { value: "minimal",   label: "Minimal",   desc: "Black & white, clean lines" },
  { value: "corporate", label: "Corporate", desc: "Full-colour top band" },
];

const watermarks: { value: WatermarkType; label: string; color: string }[] = [
  { value: "none",         label: "None",         color: "#9ca3af" },
  { value: "PAID",         label: "PAID",         color: "#16a34a" },
  { value: "DRAFT",        label: "DRAFT",        color: "#9ca3af" },
  { value: "CONFIDENTIAL", label: "CONFIDENTIAL", color: "#dc2626" },
];

export default function BrandingPanel({ branding, logo, onChange, onLogoChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      // Normalise to PNG via canvas so the PDF renderer (PNG/JPEG only) can
      // embed it — covers WebP/AVIF/SVG/HEIC logos that browsers preview fine
      // but @react-pdf cannot decode. Also caps the size.
      const img = new window.Image();
      img.onload = () => {
        const max = 480;
        let { width, height } = img;
        if (!width || !height) { onLogoChange(src); return; }
        if (width > max || height > max) {
          const scale = Math.min(max / width, max / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { onLogoChange(src); return; }
        ctx.drawImage(img, 0, 0, width, height);
        try {
          onLogoChange(canvas.toDataURL("image/png"));
        } catch {
          onLogoChange(src); // tainted canvas (rare) — fall back to original
        }
      };
      img.onerror = () => onLogoChange(src); // browser couldn't decode either
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function set<K extends keyof BrandingConfig>(key: K, value: BrandingConfig[K]) {
    onChange({ ...branding, [key]: value });
  }

  const input =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white";
  const fieldLabel = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2";

  return (
    <div className="space-y-5">
      {/* Logo */}
      <div>
        <label className={fieldLabel}>Business Logo</label>
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer hover:border-indigo-300 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {logo ? (
              <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-2xl text-gray-300">+</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => fileRef.current?.click()}
              className="text-sm text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
            >
              Upload logo
            </button>
            {logo && (
              <button
                onClick={() => onLogoChange(undefined)}
                className="text-sm text-gray-400 hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </div>
      </div>

      {/* Template */}
      <div>
        <label className={fieldLabel}>PDF Template</label>
        <div className="grid grid-cols-3 gap-2">
          {templates.map((t) => (
            <button
              key={t.value}
              onClick={() => set("template", t.value)}
              className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                (branding.template ?? "modern") === t.value
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <p className="text-xs font-semibold text-gray-700">{t.label}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <label className={fieldLabel}>Brand Colour</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={branding.primaryColor}
            onChange={(e) => set("primaryColor", e.target.value)}
            className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white"
          />
          <input
            className={input}
            value={branding.primaryColor}
            maxLength={7}
            onChange={(e) => {
              if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) set("primaryColor", e.target.value);
            }}
          />
        </div>
      </div>

      {/* Font */}
      <div>
        <label className={fieldLabel}>Font</label>
        <select
          className={input}
          value={branding.font}
          onChange={(e) => set("font", e.target.value as FontFamily)}
        >
          {fonts.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Watermark */}
      <div>
        <label className={fieldLabel}>PDF Watermark</label>
        <div className="grid grid-cols-4 gap-2">
          {watermarks.map((w) => (
            <button
              key={w.value}
              onClick={() => set("watermark", w.value)}
              className={`py-2 px-1 rounded-xl border-2 text-xs font-semibold transition-all ${
                (branding.watermark ?? "none") === w.value
                  ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 hover:border-gray-300 bg-white text-gray-600"
              }`}
              style={{ color: (branding.watermark ?? "none") === w.value ? undefined : w.color }}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Footer text */}
      <div>
        <label className={fieldLabel}>Footer Text</label>
        <input
          className={input}
          placeholder="Thank you for your business!"
          value={branding.footerText}
          onChange={(e) => set("footerText", e.target.value)}
        />
      </div>
    </div>
  );
}
