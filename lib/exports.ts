import type { InvoiceData } from "./types";
import { computeInvoice } from "./calculations";
import { getSymbol } from "./currencies";

function downloadBlob(content: BlobPart, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Build the CSV text for a set of invoices (pure — testable). */
export function buildInvoiceCSV(invoices: InvoiceData[]): string {
  const headers = [
    "Type", "Number", "PO Number", "Issue Date", "Due Date", "Status",
    "Client", "Client Email", "Currency", "Subtotal", "Discount", "Tax",
    "Late Fee", "Total", "Paid", "Balance",
  ];
  const rows = invoices.map((i) => {
    const c = computeInvoice(i);
    return [
      i.documentType, i.invoiceNumber, i.poNumber ?? "", i.issueDate, i.dueDate,
      i.status, i.client?.name ?? "", i.client?.email ?? "", i.currency,
      c.subtotal.toFixed(2), c.discount.toFixed(2), c.tax.toFixed(2),
      c.lateFee.toFixed(2), c.total.toFixed(2), c.paid.toFixed(2), c.balance.toFixed(2),
    ].map(csvCell).join(",");
  });
  return [headers.join(","), ...rows].join("\n");
}

/** Export all invoices to a CSV file for bookkeeping / Excel. */
export function exportInvoicesCSV(invoices: InvoiceData[]): void {
  downloadBlob(buildInvoiceCSV(invoices), `invoices-export-${new Date().toISOString().split("T")[0]}.csv`, "text/csv;charset=utf-8;");
}

/** Build a tax-report payload and POST it to the PDF route, then download. */
export async function downloadTaxReport(invoices: InvoiceData[], currency: string): Promise<void> {
  const symbol = getSymbol(currency);
  const inv = invoices.filter((i) => i.documentType === "invoice" && i.currency === currency);

  const rows = inv.map((i) => {
    const c = computeInvoice(i);
    return {
      number: i.invoiceNumber,
      date: i.issueDate,
      client: i.client?.name ?? "",
      net: c.afterDiscount,
      tax: c.tax,
      total: c.total,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({ net: acc.net + r.net, tax: acc.tax + r.tax, total: acc.total + r.total }),
    { net: 0, tax: 0, total: 0 }
  );

  const res = await fetch("/api/tax-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows, totals, symbol, currency }),
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tax-report-${currency}-${new Date().toISOString().split("T")[0]}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
