import { describe, it, expect } from "vitest";
import { can } from "@/lib/auth";

describe("role permissions", () => {
  it("manager has full access", () => {
    expect(can("manager", "manageTeam")).toBe(true);
    expect(can("manager", "settings")).toBe(true);
    expect(can("manager", "deleteRecords")).toBe(true);
  });

  it("team lead: dashboard/exports/delete, but no team or settings", () => {
    expect(can("lead", "dashboard")).toBe(true);
    expect(can("lead", "exports")).toBe(true);
    expect(can("lead", "deleteRecords")).toBe(true);
    expect(can("lead", "manageTeam")).toBe(false);
    expect(can("lead", "settings")).toBe(false);
  });

  it("agent: edit records only — no dashboard/delete/team/settings", () => {
    expect(can("agent", "editInvoices")).toBe(true);
    expect(can("agent", "manageRecords")).toBe(true);
    expect(can("agent", "dashboard")).toBe(false);
    expect(can("agent", "deleteRecords")).toBe(false);
    expect(can("agent", "manageTeam")).toBe(false);
    expect(can("agent", "settings")).toBe(false);
  });
});
