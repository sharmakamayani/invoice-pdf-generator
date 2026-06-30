import { describe, it, expect } from "vitest";
import { buildInvoiceCSV } from "@/lib/exports";
import { makeInvoice } from "./fixtures";

describe("buildInvoiceCSV", () => {
  it("emits a header row plus one row per invoice", () => {
    const csv = buildInvoiceCSV([makeInvoice(), makeInvoice({ id: "2", invoiceNumber: "INV-002" })]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3); // header + 2
    expect(lines[0]).toContain("Number");
    expect(lines[0]).toContain("Balance");
  });

  it("quotes and escapes fields containing commas or quotes", () => {
    const csv = buildInvoiceCSV([makeInvoice({ client: { name: 'Smith, Jones & "Co"', address: "", email: "" } })]);
    expect(csv).toContain('"Smith, Jones & ""Co"""');
  });

  it("includes computed totals", () => {
    const csv = buildInvoiceCSV([makeInvoice({ taxRate: 10 })]);
    const row = csv.split("\n")[1];
    expect(row).toContain("220.00"); // total 200 + 10% tax
  });
});
