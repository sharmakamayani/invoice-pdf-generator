import { describe, it, expect } from "vitest";
import { computeInvoice, isOverdue } from "@/lib/calculations";
import { makeInvoice } from "./fixtures";

describe("computeInvoice", () => {
  it("computes subtotal from line items", () => {
    const c = computeInvoice(makeInvoice());
    expect(c.subtotal).toBe(200); // 2 × 100
    expect(c.total).toBe(200);
    expect(c.balance).toBe(200);
  });

  it("applies a percentage discount before tax", () => {
    const c = computeInvoice(makeInvoice({ discount: { type: "percentage", value: 10 }, taxRate: 20 }));
    expect(c.discount).toBe(20);            // 10% of 200
    expect(c.afterDiscount).toBe(180);
    expect(c.tax).toBe(36);                 // 20% of 180
    expect(c.total).toBe(216);
  });

  it("applies a fixed discount capped at the subtotal", () => {
    const c = computeInvoice(makeInvoice({ discount: { type: "fixed", value: 500 } }));
    expect(c.discount).toBe(200);           // capped at subtotal
    expect(c.total).toBe(0);
  });

  it("adds a late fee only when overdue", () => {
    const notOverdue = computeInvoice(makeInvoice({ lateFee: { enabled: true, type: "percentage", value: 5 }, dueDate: "2999-01-01" }));
    expect(notOverdue.lateFee).toBe(0);

    const overdue = computeInvoice(makeInvoice({ lateFee: { enabled: true, type: "percentage", value: 5 }, dueDate: "2000-01-01" }));
    expect(overdue.lateFee).toBe(10);       // 5% of 200
    expect(overdue.total).toBe(210);
  });

  it("computes deposit from the total", () => {
    const c = computeInvoice(makeInvoice({ deposit: { enabled: true, type: "percentage", value: 50 } }));
    expect(c.deposit).toBe(100);
  });

  it("tracks partial payments and balance", () => {
    const c = computeInvoice(makeInvoice({
      payments: [
        { id: "p1", date: "2026-06-10", amount: 50, method: "bank" },
        { id: "p2", date: "2026-06-20", amount: 30, method: "card" },
      ],
    }));
    expect(c.paid).toBe(80);
    expect(c.balance).toBe(120);
  });

  it("never reports a negative balance when overpaid", () => {
    const c = computeInvoice(makeInvoice({ payments: [{ id: "p1", date: "x", amount: 9999, method: "cash" }] }));
    expect(c.balance).toBe(0);
  });
});

describe("isOverdue", () => {
  it("is true for an unpaid invoice past its due date", () => {
    expect(isOverdue(makeInvoice({ dueDate: "2000-01-01", status: "unpaid" }))).toBe(true);
  });
  it("is false when paid", () => {
    expect(isOverdue(makeInvoice({ dueDate: "2000-01-01", status: "paid" }))).toBe(false);
  });
  it("is false for quotes", () => {
    expect(isOverdue(makeInvoice({ dueDate: "2000-01-01", documentType: "quote" }))).toBe(false);
  });
  it("is false before the due date", () => {
    expect(isOverdue(makeInvoice({ dueDate: "2999-01-01" }))).toBe(false);
  });
});
