"use client";

import { useState } from "react";
import type { Payment, PaymentMethod } from "@/lib/types";
import { getSymbol } from "@/lib/currencies";

interface Props {
  payments: Payment[];
  currency: string;
  total: number;
  onChange: (payments: Payment[]) => void;
}

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "bank",   label: "Bank Transfer" },
  { value: "card",   label: "Card" },
  { value: "cash",   label: "Cash" },
  { value: "paypal", label: "PayPal" },
  { value: "stripe", label: "Stripe" },
  { value: "other",  label: "Other" },
];

export default function PaymentsPanel({ payments, currency, total, onChange }: Props) {
  const symbol = getSymbol(currency);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("bank");

  const paid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const balance = Math.max(0, total - paid);

  function addPayment() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    const p: Payment = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split("T")[0],
      amount: amt,
      method,
    };
    onChange([...payments, p]);
    setAmount("");
  }

  function removePayment(id: string) {
    onChange(payments.filter((p) => p.id !== id));
  }

  function payInFull() {
    if (balance <= 0) return;
    onChange([
      ...payments,
      { id: crypto.randomUUID(), date: new Date().toISOString().split("T")[0], amount: balance, method },
    ]);
  }

  const input =
    "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white";

  return (
    <div className="space-y-3">
      {/* Balance summary */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-gray-50 py-2">
          <p className="text-xs text-gray-400">Total</p>
          <p className="text-sm font-bold text-gray-700">{symbol}{total.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-green-50 py-2">
          <p className="text-xs text-green-600">Paid</p>
          <p className="text-sm font-bold text-green-700">{symbol}{paid.toFixed(2)}</p>
        </div>
        <div className="rounded-lg py-2" style={{ background: balance > 0 ? "#fef3c7" : "#d1fae5" }}>
          <p className="text-xs" style={{ color: balance > 0 ? "#d97706" : "#16a34a" }}>Balance</p>
          <p className="text-sm font-bold" style={{ color: balance > 0 ? "#d97706" : "#16a34a" }}>
            {symbol}{balance.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Add payment */}
      <div className="flex gap-2">
        <input
          className={`${input} flex-1`}
          type="number"
          min={0}
          step={0.01}
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <select className={input} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <button
          onClick={addPayment}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          Record
        </button>
      </div>

      {balance > 0 && (
        <button
          onClick={payInFull}
          className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
        >
          Mark balance paid in full ({symbol}{balance.toFixed(2)})
        </button>
      )}

      {/* Payment list */}
      {payments.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-gray-100">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {p.date} · <span className="capitalize">{p.method}</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-700">{symbol}{p.amount.toFixed(2)}</span>
                <button
                  onClick={() => removePayment(p.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
