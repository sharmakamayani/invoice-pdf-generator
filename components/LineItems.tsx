"use client";

import { useState } from "react";
import type { LineItem, LineCategory, CatalogItem } from "@/lib/types";
import { getSymbol } from "@/lib/currencies";
import { loadCatalog, saveCatalogItem } from "@/lib/storage";

interface Props {
  items: LineItem[];
  currency: string;
  onChange: (items: LineItem[]) => void;
}

const CATEGORIES: { value: LineCategory; label: string; color: string }[] = [
  { value: "labour",    label: "Labour",    color: "#4F46E5" },
  { value: "materials", label: "Materials", color: "#0d9488" },
  { value: "expenses",  label: "Expenses",  color: "#d97706" },
  { value: "other",     label: "Other",     color: "#6b7280" },
];

function newItem(): LineItem {
  return { id: crypto.randomUUID(), description: "", quantity: 1, rate: 0, category: "labour" };
}

export default function LineItems({ items, currency, onChange }: Props) {
  const symbol = getSymbol(currency);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);

  function update(id: string, field: keyof LineItem, value: string | number) {
    onChange(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function remove(id: string) {
    onChange(items.filter((item) => item.id !== id));
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const reordered = [...items];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    onChange(reordered);
    setDragIndex(null);
  }

  function openCatalog() {
    setCatalog(loadCatalog());
    setShowCatalog((v) => !v);
  }

  function addFromCatalog(c: CatalogItem) {
    onChange([
      ...items,
      { id: crypto.randomUUID(), description: c.description || c.name, quantity: 1, rate: c.defaultRate, category: c.category },
    ]);
  }

  function saveItemToCatalog(item: LineItem) {
    if (!item.description) return;
    saveCatalogItem({
      id: crypto.randomUUID(),
      name: item.description,
      description: item.description,
      defaultRate: item.rate,
      category: item.category ?? "other",
    });
    setCatalog(loadCatalog());
  }

  const input =
    "w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white";

  return (
    <div>
      {/* Header row */}
      <div className="grid grid-cols-12 gap-2 mb-1 px-1">
        <span className="col-span-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Description</span>
        <span className="col-span-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</span>
        <span className="col-span-1 text-xs font-medium text-gray-500 uppercase tracking-wide text-center">Qty</span>
        <span className="col-span-2 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Rate ({symbol})</span>
        <span className="col-span-2 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Amount</span>
        <span className="col-span-1" />
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`grid grid-cols-12 gap-2 items-center rounded-lg transition-colors ${
              dragIndex === index ? "opacity-40" : ""
            }`}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
          >
            <div className="col-span-4 flex items-center gap-1">
              <span
                className="cursor-grab text-gray-300 hover:text-gray-500 select-none px-1"
                title="Drag to reorder"
              >
                ⠿
              </span>
              <input
                className={input}
                placeholder="Item description"
                value={item.description}
                onChange={(e) => update(item.id, "description", e.target.value)}
              />
            </div>
            <select
              className={`col-span-2 ${input}`}
              value={item.category ?? "labour"}
              onChange={(e) => update(item.id, "category", e.target.value as LineCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <input
              className={`col-span-1 ${input} text-center`}
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
            <div className="col-span-1 flex items-center justify-end gap-1">
              <button
                onClick={() => saveItemToCatalog(item)}
                className="text-gray-300 hover:text-indigo-500 text-xs transition-colors"
                title="Save to catalog"
              >
                ★
              </button>
              <button
                onClick={() => remove(item.id)}
                className="text-gray-300 hover:text-red-400 text-lg font-bold transition-colors"
                aria-label="Remove item"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-3">
        <button
          onClick={() => onChange([...items, newItem()])}
          className="text-sm text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors"
        >
          + Add line item
        </button>
        <button
          onClick={openCatalog}
          className="text-sm text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1 transition-colors"
        >
          ★ From catalog
        </button>
      </div>

      {/* Catalog dropdown */}
      {showCatalog && (
        <div className="mt-3 border border-gray-200 rounded-xl p-3 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Saved Items ({catalog.length})
          </p>
          {catalog.length === 0 ? (
            <p className="text-sm text-gray-400">
              No saved items yet. Click the ★ next to a line item to save it for reuse.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {catalog.map((c) => (
                <button
                  key={c.id}
                  onClick={() => addFromCatalog(c)}
                  className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-gray-100 hover:border-indigo-200 transition-colors"
                >
                  <span className="text-sm text-gray-700 truncate">{c.name}</span>
                  <span className="text-sm font-medium text-gray-500 ml-2 flex-shrink-0">
                    {symbol}{c.defaultRate.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
