import type { InvoiceData } from "./types";
import { loadInvoices, saveInvoice } from "./storage";

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function nextNumber(): string {
  const n = parseInt(localStorage.getItem("inv_counter") ?? "0") + 1;
  localStorage.setItem("inv_counter", String(n));
  return `INV-${String(n).padStart(3, "0")}`;
}

/**
 * Scan saved invoices for recurring ones whose next cycle is due, and
 * generate a fresh draft copy for each. Returns the number generated.
 *
 * Note: true scheduled delivery (sending while the app is closed) requires a
 * backend/cron — this generates the next invoice the next time the app opens.
 */
export function generateDueRecurring(): number {
  const all = loadInvoices();
  const today = new Date().toISOString().split("T")[0];
  let generated = 0;

  all.forEach((inv) => {
    if (!inv.recurring) return;
    const interval = inv.recurringInterval || 30;
    const anchor = inv.lastGeneratedDate || inv.issueDate;
    const nextDue = addDays(anchor, interval);
    if (nextDue > today) return; // not yet due

    // Avoid duplicating: mark the source as generated up to today
    inv.lastGeneratedDate = today;
    saveInvoice(inv);

    const copy: InvoiceData = {
      ...inv,
      id: crypto.randomUUID(),
      invoiceNumber: nextNumber(),
      issueDate: today,
      dueDate: addDays(today, 30),
      status: "unpaid",
      payments: [],
      recurring: false, // the generated copy is a one-off; source keeps recurring
      lastGeneratedDate: undefined,
    };
    saveInvoice(copy);
    generated += 1;
  });

  return generated;
}
