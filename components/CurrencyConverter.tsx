"use client";

import { useState } from "react";
import { currencies, getSymbol } from "@/lib/currencies";
import { fetchRate } from "@/lib/exchangeRates";

interface Props {
  baseCurrency: string;
  amount: number;
}

export default function CurrencyConverter({ baseCurrency, amount }: Props) {
  const [target, setTarget] = useState("EUR");
  const [result, setResult] = useState<{ value: number; rate: number; source: string; date: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function convert() {
    setLoading(true);
    try {
      const r = await fetchRate(baseCurrency, target);
      setResult({ value: amount * r.rate, rate: r.rate, source: r.source, date: r.date });
    } finally {
      setLoading(false);
    }
  }

  const input =
    "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white";

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <span className="text-sm text-gray-500 whitespace-nowrap">Convert total to</span>
        <select className={`${input} flex-1`} value={target} onChange={(e) => setTarget(e.target.value)}>
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
          ))}
        </select>
        <button
          onClick={convert}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-40"
        >
          {loading ? "…" : "Convert"}
        </button>
      </div>
      {result && (
        <div className="rounded-lg bg-indigo-50 px-3 py-2 text-sm">
          <span className="font-bold text-indigo-700">
            {getSymbol(target)}{result.value.toFixed(2)} {target}
          </span>
          <span className="text-xs text-gray-500 ml-2">
            @ {result.rate.toFixed(4)} ({result.source === "live" ? "live rate" : "offline rate"}
            {result.date ? `, ${result.date}` : ""})
          </span>
        </div>
      )}
    </div>
  );
}
