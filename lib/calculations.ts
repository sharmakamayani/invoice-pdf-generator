import type { LineItem, Discount, DepositConfig, LateFeeConfig, Payment, InvoiceData } from "./types";

export function calcSubtotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
}

export function calcDiscount(subtotal: number, discount: Discount): number {
  if (!discount?.value) return 0;
  if (discount.type === "percentage") return subtotal * (discount.value / 100);
  return Math.min(discount.value, subtotal);
}

export function calcAfterDiscount(subtotal: number, discount: Discount): number {
  return subtotal - calcDiscount(subtotal, discount);
}

export function calcTax(afterDiscount: number, taxRate: number): number {
  return afterDiscount * (taxRate / 100);
}

export function calcLateFee(total: number, lateFee: LateFeeConfig | undefined, isOverdue: boolean): number {
  if (!lateFee?.enabled || !lateFee.value || !isOverdue) return 0;
  if (lateFee.type === "percentage") return total * (lateFee.value / 100);
  return lateFee.value;
}

export function calcDeposit(total: number, deposit: DepositConfig | undefined): number {
  if (!deposit?.enabled || !deposit.value) return 0;
  if (deposit.type === "percentage") return total * (deposit.value / 100);
  return Math.min(deposit.value, total);
}

export function calcPaid(payments: Payment[] | undefined): number {
  if (!payments?.length) return 0;
  return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
}

export function calcTotal(afterDiscount: number, tax: number): number {
  return afterDiscount + tax;
}

/** Full computation for an invoice — single source of truth. */
export function computeInvoice(data: InvoiceData) {
  const subtotal = calcSubtotal(data.lineItems);
  const discount = calcDiscount(subtotal, data.discount ?? { type: "percentage", value: 0 });
  const afterDiscount = subtotal - discount;
  const tax = calcTax(afterDiscount, data.taxRate);
  const baseTotal = afterDiscount + tax;
  const overdue = isOverdue(data);
  const lateFee = calcLateFee(baseTotal, data.lateFee, overdue);
  const total = baseTotal + lateFee;
  const deposit = calcDeposit(total, data.deposit);
  const paid = calcPaid(data.payments);
  const balance = Math.max(0, total - paid);
  return { subtotal, discount, afterDiscount, tax, baseTotal, lateFee, total, deposit, paid, balance, overdue };
}

export function isOverdue(data: InvoiceData): boolean {
  if (data.documentType !== "invoice") return false;
  if (data.status === "paid" || data.status === "accepted") return false;
  if (!data.dueDate) return false;
  const due = new Date(data.dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return due < now;
}

export function fmt(amount: number, symbol: string): string {
  return `${symbol}${amount.toFixed(2)}`;
}
