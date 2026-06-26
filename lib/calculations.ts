import type { LineItem } from "./types";

export function calcSubtotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
}

export function calcTax(subtotal: number, taxRate: number): number {
  return subtotal * (taxRate / 100);
}

export function calcTotal(subtotal: number, tax: number): number {
  return subtotal + tax;
}

export function fmt(amount: number, symbol: string): string {
  return `${symbol}${amount.toFixed(2)}`;
}
