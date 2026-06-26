"use client";

import type { LineItem } from "@/lib/types";
import { getSymbol } from "@/lib/currencies";

interface Props {
  items: LineItem[];
  currency: string;
  onChange: (items: LineItem[]) => void;
}

function newItem(): LineItem {
  return { id: crypto.randomUUID(), description: "", quantity: 1, rate: 0 };
}

export default function LineItems({ items, currency, onChange }: Props) {
  const symbol = getSymbol(currency);

  function update(id: string, field: keyof LineItem, value: string | number) {
    onChange(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function remove(id: string) {
    onChange(items.filter((item) => item.id !== id));
  }

  const input =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white";

  return (
    <div>
      <div className="grid grid-cols-12 gap-2 mb-1 px-1">
        <span className="col-span-5 text-xs font-medium text-gray-500 uppercase tracking-wide">Description</span>
        <span className="col-span-2 text-xs font-medium text-gray-500 uppercase tracking-wide text-center">Qty</span>
        <span className="col-span-2 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Rate ({symbol})</span>
        <span className="col-span-2 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Amount</span>
        <span className="col-span-1" />
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
            <input
              className={`col-span-5 ${input}`}
              placeholder="Item description"
              value={item.description}
              onChange={(e) => update(item.id, "description", e.target.value)}
            />
            <input
              className={`col-span-2 ${input} text-center`}
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => update(item.id, "quantity", Math.max(1, Number(e.target.value)))}
            />
            <input
              className={`col-span-2 ${input} text-right`}
              type="number"
              min={0}
              step={0.01}
              value={item.rate}
              onChange={(e) => update(item.id, "rate", Number(e.target.value))}
            />
            <div className="col-span-2 text-right text-sm font-medium text-gray-700">
              {symbol}{(item.quantity * item.rate).toFixed(2)}
            </div>
            <button
              onClick={() => remove(item.id)}
              className="col-span-1 text-gray-300 hover:text-red-400 text-lg font-bold transition-colors"
              aria-label="Remove item"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => onChange([...items, newItem()])}
        className="mt-3 text-sm text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors"
      >
        + Add line item
      </button>
    </div>
  );
}
