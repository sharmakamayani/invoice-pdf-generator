import { describe, it, expect } from "vitest";
import { generateDueRecurring } from "@/lib/recurring";
import { saveInvoice, loadInvoices } from "@/lib/storage";
import { makeInvoice } from "./fixtures";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

describe("generateDueRecurring", () => {
  it("does nothing when there are no recurring invoices", () => {
    saveInvoice(makeInvoice({ recurring: false }));
    expect(generateDueRecurring()).toBe(0);
  });

  it("does not generate before the next cycle is due", () => {
    saveInvoice(makeInvoice({ id: "r1", recurring: true, recurringInterval: 30, issueDate: daysAgo(5) }));
    expect(generateDueRecurring()).toBe(0);
    expect(loadInvoices()).toHaveLength(1);
  });

  it("generates a new invoice once the cycle has elapsed", () => {
    saveInvoice(makeInvoice({ id: "r2", recurring: true, recurringInterval: 30, issueDate: daysAgo(40) }));
    expect(generateDueRecurring()).toBe(1);
    const all = loadInvoices();
    expect(all).toHaveLength(2);
    // the generated copy is a one-off (not itself recurring)
    expect(all.some((i) => !i.recurring && i.id !== "r2")).toBe(true);
  });

  it("does not regenerate immediately on a second run", () => {
    saveInvoice(makeInvoice({ id: "r3", recurring: true, recurringInterval: 30, issueDate: daysAgo(40) }));
    expect(generateDueRecurring()).toBe(1);
    expect(generateDueRecurring()).toBe(0); // lastGeneratedDate now = today
  });
});
