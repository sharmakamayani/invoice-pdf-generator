import { describe, it, expect } from "vitest";
import {
  saveProject, loadProjects, deleteProject,
  saveExpense, loadExpenses, deleteExpense,
} from "@/lib/storage";
import { SYNC_KEYS } from "@/lib/fileSync";
import type { Project, Expense } from "@/lib/types";

const proj = (o: Partial<Project> = {}): Project => ({
  id: "p1", name: "Site", clientName: "Acme", budget: 1000, currency: "USD", archived: false, createdAt: "2026-01-01", ...o,
});
const exp = (o: Partial<Expense> = {}): Expense => ({
  id: "e1", date: "2026-06-01", vendor: "Adobe", description: "", amount: 52.99, currency: "USD", category: "software", billable: false, createdAt: "2026-06-01", ...o,
});

describe("projects storage", () => {
  it("saves, loads, updates and deletes", () => {
    saveProject(proj());
    expect(loadProjects()).toHaveLength(1);
    saveProject(proj({ name: "Renamed" }));      // same id → update
    expect(loadProjects()).toHaveLength(1);
    expect(loadProjects()[0].name).toBe("Renamed");
    deleteProject("p1");
    expect(loadProjects()).toHaveLength(0);
  });
});

describe("expenses storage", () => {
  it("saves, loads and deletes", () => {
    saveExpense(exp());
    saveExpense(exp({ id: "e2", vendor: "AWS" }));
    expect(loadExpenses()).toHaveLength(2);
    deleteExpense("e1");
    expect(loadExpenses().map((e) => e.id)).toEqual(["e2"]);
  });
});

describe("backup coverage", () => {
  it("includes projects and expenses in the sync key set", () => {
    expect(SYNC_KEYS).toContain("projects");
    expect(SYNC_KEYS).toContain("expenses");
  });
});
