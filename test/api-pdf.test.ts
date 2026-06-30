// @vitest-environment node
import { describe, it, expect } from "vitest";
import { POST as generatePdf } from "@/app/api/generate-pdf/route";
import { POST as taxReport } from "@/app/api/tax-report/route";
import { POST as receipt } from "@/app/api/receipt/route";
import { makeInvoice } from "./fixtures";

function jsonReq(url: string, body: unknown) {
  return new Request(url, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
}

async function assertPdf(res: Response) {
  expect(res.headers.get("content-type")).toBe("application/pdf");
  const buf = Buffer.from(await res.arrayBuffer());
  expect(buf.length).toBeGreaterThan(500);
  expect(buf.subarray(0, 4).toString("latin1")).toBe("%PDF");
}

describe("PDF routes", () => {
  it("generate-pdf returns a valid PDF", async () => {
    const res = await generatePdf(jsonReq("http://localhost/api/generate-pdf", makeInvoice()));
    await assertPdf(res);
  }, 30000);

  it("receipt returns a valid PDF for a paid invoice", async () => {
    const paid = makeInvoice({ status: "paid", payments: [{ id: "p1", date: "2026-06-15", amount: 200, method: "bank" }] });
    const res = await receipt(jsonReq("http://localhost/api/receipt", paid));
    await assertPdf(res);
  }, 30000);

  it("tax-report returns a valid PDF", async () => {
    const body = {
      rows: [{ number: "INV-1", date: "2026-06-01", client: "Acme", net: 200, tax: 40, total: 240 }],
      totals: { net: 200, tax: 40, total: 240 },
      symbol: "$",
      currency: "USD",
    };
    const res = await taxReport(jsonReq("http://localhost/api/tax-report", body));
    await assertPdf(res);
  }, 30000);
});
