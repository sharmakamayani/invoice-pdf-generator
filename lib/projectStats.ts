import type { Project } from "./types";
import { loadInvoices, loadTimeEntries, loadExpenses } from "./storage";
import { computeInvoice } from "./calculations";

export interface ProjectStats {
  invoiced: number;   // billed to client (sum of linked invoice totals)
  timeValue: number;  // logged time × rate
  expenses: number;   // linked expenses
  cost: number;       // timeValue + expenses (what the work is costing you)
  remaining: number;  // budget − cost
  pctUsed: number;    // cost / budget (0..>1)
  overBudget: boolean;
  invoiceCount: number;
}

export function projectStats(project: Project): ProjectStats {
  const invoices = loadInvoices().filter((i) => i.projectId === project.id);
  const invoiced = invoices.reduce((s, i) => s + computeInvoice(i).total, 0);

  const timeValue = loadTimeEntries()
    .filter((t) => t.projectId === project.id)
    .reduce((s, t) => s + (t.seconds / 3600) * t.hourlyRate, 0);

  const expenses = loadExpenses()
    .filter((e) => e.projectId === project.id)
    .reduce((s, e) => s + e.amount, 0);

  const cost = timeValue + expenses;
  const budget = project.budget || 0;
  const remaining = budget - cost;
  const pctUsed = budget > 0 ? cost / budget : 0;

  return {
    invoiced,
    timeValue,
    expenses,
    cost,
    remaining,
    pctUsed,
    overBudget: budget > 0 && cost > budget,
    invoiceCount: invoices.length,
  };
}
