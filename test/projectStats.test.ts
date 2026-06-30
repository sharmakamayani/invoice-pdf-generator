import { describe, it, expect } from "vitest";
import { projectStats } from "@/lib/projectStats";
import { saveInvoice, saveExpense, saveTimeEntry } from "@/lib/storage";
import { makeInvoice } from "./fixtures";
import type { Project } from "@/lib/types";

const project: Project = { id: "p1", name: "Site", clientName: "Acme", budget: 1000, currency: "USD", archived: false, createdAt: "2026-01-01" };

describe("projectStats", () => {
  it("sums invoiced totals, time value and expenses for the project", () => {
    saveInvoice(makeInvoice({ id: "i1", projectId: "p1", lineItems: [{ id: "l", description: "x", quantity: 1, rate: 600, category: "labour" }] }));
    saveInvoice(makeInvoice({ id: "i2", projectId: "other" })); // unrelated
    saveTimeEntry({ id: "t1", description: "dev", seconds: 3600 * 2, hourlyRate: 50, date: "2026-06-01", projectId: "p1" }); // 2h × 50 = 100
    saveExpense({ id: "e1", date: "2026-06-01", vendor: "AWS", description: "", amount: 200, currency: "USD", category: "software", billable: false, createdAt: "2026-06-01", projectId: "p1" });

    const s = projectStats(project);
    expect(s.invoiced).toBe(600);
    expect(s.timeValue).toBe(100);
    expect(s.expenses).toBe(200);
    expect(s.cost).toBe(300);          // time + expenses
    expect(s.remaining).toBe(700);     // 1000 − 300
    expect(s.overBudget).toBe(false);
    expect(s.invoiceCount).toBe(1);
  });

  it("flags over budget when cost exceeds the budget", () => {
    saveExpense({ id: "e2", date: "2026-06-01", vendor: "Sub", description: "", amount: 1500, currency: "USD", category: "subcontractor", billable: false, createdAt: "2026-06-01", projectId: "p1" });
    const s = projectStats(project);
    expect(s.overBudget).toBe(true);
    expect(s.remaining).toBeLessThan(0);
  });
});
