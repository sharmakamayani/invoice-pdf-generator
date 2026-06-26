"use client";

import { useRef } from "react";
import type { BrandingConfig, FontFamily } from "@/lib/types";

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

export default function BrandingPanel({ branding, logo, onChange, onLogoChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onLogoChange(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function set<K extends keyof BrandingConfig>(key: K, value: BrandingConfig[K]) {
    onChange({ ...branding, [key]: value });
  }

  const input =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white";

  return (
    <div className="space-y-4">
      {/* Logo */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Business Logo
        </label>
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
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Brand Colour
        </label>
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
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Font
        </label>
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

      {/* Footer text */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Footer Text
        </label>
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
