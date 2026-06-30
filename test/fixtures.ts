import type { InvoiceData } from "@/lib/types";

/** A complete, valid InvoiceData with sensible defaults; override as needed. */
export function makeInvoice(overrides: Partial<InvoiceData> = {}): InvoiceData {
  return {
    id: "inv-1",
    documentType: "invoice",
    invoiceNumber: "INV-001",
    poNumber: "",
    issueDate: "2026-06-01",
    dueDate: "2026-07-01",
    paymentTerms: "net30",
    status: "unpaid",
    recurring: false,
    recurringInterval: 30,
    business: { name: "Studio", address: "1 St", email: "me@studio.com", phone: "+1 555" },
    client: { name: "Client Co", address: "2 Ave", email: "ap@client.com" },
    lineItems: [{ id: "l1", description: "Work", quantity: 2, rate: 100, category: "labour" }],
    discount: { type: "percentage", value: 0 },
    deposit: { enabled: false, type: "percentage", value: 50 },
    lateFee: { enabled: false, type: "percentage", value: 5 },
    taxRate: 0,
    currency: "USD",
    payments: [],
    paymentLink: "",
    notes: "",
    terms: "",
    signature: "",
    language: "en",
    branding: { primaryColor: "#4F46E5", font: "Helvetica", footerText: "Thanks", template: "modern", watermark: "none" },
    ...overrides,
  };
}
