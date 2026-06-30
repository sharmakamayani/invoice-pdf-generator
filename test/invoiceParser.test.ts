import { describe, it, expect } from "vitest";
import { parseInvoiceText, extractDate, parseReceiptText } from "@/lib/invoiceParser";

describe("extractDate", () => {
  it("parses ISO dates", () => {
    expect(extractDate("Issued 2026-03-15")).toBe("2026-03-15");
  });
  it("parses month-name dates (both orders)", () => {
    expect(extractDate("14 April 2026")).toBe("2026-04-14");
    expect(extractDate("March 15, 2026")).toBe("2026-03-15");
  });
  it("disambiguates DD/MM when day > 12", () => {
    expect(extractDate("15/03/2026")).toBe("2026-03-15");
  });
  it("disambiguates MM/DD when second number > 12", () => {
    expect(extractDate("03/15/2026")).toBe("2026-03-15");
  });
  it("returns empty for implausible years", () => {
    expect(extractDate("555-123-4567")).toBe("");
  });
});

describe("parseInvoiceText", () => {
  const sample = `
Brightwave Studio
12 Harbour Rd, Bristol
hello@brightwave.io   +44 117 555 0100

INVOICE
Invoice No: INV-2042
PO Number: PO-9988
Issue Date: 15/03/2026
Due Date: 14 April 2026

Bill To:
Northwind Ltd
55 King St, London
ap@northwind.co.uk

Description            Qty    Rate      Amount
Brand identity design   1    2400.00   2400.00
Logo revisions          3    150.00    450.00

Subtotal                              2850.00
VAT 20%                                570.00
Total Due                          GBP 3420.00
`;

  it("extracts header fields", () => {
    const r = parseInvoiceText(sample);
    expect(r.documentType).toBe("invoice");
    expect(r.invoiceNumber).toBe("INV-2042");
    expect(r.poNumber).toBe("PO-9988");
    expect(r.issueDate).toBe("2026-03-15");
    expect(r.dueDate).toBe("2026-04-14");
    expect(r.currency).toBe("GBP");
    expect(r.taxRate).toBe(20);
  });

  it("splits business and client", () => {
    const r = parseInvoiceText(sample);
    expect(r.business.name).toBe("Brightwave Studio");
    expect(r.business.email).toBe("hello@brightwave.io");
    expect(r.client.name).toBe("Northwind Ltd");
    expect(r.client.email).toBe("ap@northwind.co.uk");
  });

  it("extracts line items and computes the unit rate from a line total", () => {
    const r = parseInvoiceText(sample);
    expect(r.lineItems).toHaveLength(2);
    expect(r.lineItems[0]).toMatchObject({ description: "Brand identity design", quantity: 1, rate: 2400 });
    expect(r.lineItems[1]).toMatchObject({ description: "Logo revisions", quantity: 3, rate: 150 });
  });

  it("detects a quote", () => {
    expect(parseInvoiceText("QUOTATION\nQuote #: QTE-1").documentType).toBe("quote");
  });
});

describe("parseReceiptText", () => {
  it("extracts vendor, date, total, tax and currency", () => {
    const r = parseReceiptText(`
ADOBE INC
Date: 03/15/2026
Creative Cloud           $52.99
Tax                       $4.50
Total                    $57.49
`);
    expect(r.vendor).toBe("ADOBE INC");
    expect(r.date).toBe("2026-03-15");
    expect(r.currency).toBe("USD");
    expect(r.total).toBe(57.49);
    expect(r.tax).toBe(4.5);
  });

  it("falls back to the largest amount when no total label", () => {
    const r = parseReceiptText("Corner Cafe\nLatte 4.50\nCake 6.00\n");
    expect(r.total).toBe(6);
  });
});
