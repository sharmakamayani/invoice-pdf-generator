import type { InvoiceData, LineItem } from "./types";
import { currencies } from "./currencies";
import type { LLMSettings } from "./llmSettings";

export interface ExtractedInvoice {
  documentType: "invoice" | "quote";
  invoiceNumber: string;
  poNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  taxRate: number;
  discountValue: number;
  discountType: "percentage" | "fixed";
  business: { name: string; address: string; email: string; phone: string };
  client: { name: string; address: string; email: string };
  lineItems: { description: string; quantity: number; rate: number }[];
  notes: string;
  terms: string;
}

const validCodes = new Set(currencies.map((c) => c.code));

/** Read a File into base64 (without the data: prefix) + its media type. */
export function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve({ base64, mediaType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export interface ExtractedReceipt {
  vendor: string;
  date: string;
  total: number;
  tax: number;
  currency: string;
  category: string;
}

async function callOcr(file: File, settings: LLMSettings, kind: "invoice" | "receipt") {
  const { base64, mediaType } = await fileToBase64(file);
  const res = await fetch("/api/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.model,
      base64,
      mediaType,
      kind,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Extraction failed.");
  return json.data;
}

/** Call the OCR endpoint with the user's chosen provider + key. */
export async function scanInvoice(file: File, settings: LLMSettings): Promise<ExtractedInvoice> {
  return (await callOcr(file, settings, "invoice")) as ExtractedInvoice;
}

export async function scanReceipt(file: File, settings: LLMSettings): Promise<ExtractedReceipt> {
  return (await callOcr(file, settings, "receipt")) as ExtractedReceipt;
}

/**
 * Merge extracted fields onto the current invoice, preserving the user's
 * branding, id, payments, and any field the scan left blank.
 */
export function applyExtraction(current: InvoiceData, ex: ExtractedInvoice): InvoiceData {
  const keep = (next: string, prev: string) => (next && next.trim() ? next : prev);
  const currency = validCodes.has(ex.currency?.toUpperCase()) ? ex.currency.toUpperCase() : current.currency;

  const lineItems: LineItem[] =
    ex.lineItems && ex.lineItems.length > 0
      ? ex.lineItems.map((li) => ({
          id: crypto.randomUUID(),
          description: li.description ?? "",
          quantity: li.quantity > 0 ? li.quantity : 1,
          rate: li.rate >= 0 ? li.rate : 0,
          category: "labour" as const,
        }))
      : current.lineItems;

  return {
    ...current,
    documentType: ex.documentType ?? current.documentType,
    invoiceNumber: keep(ex.invoiceNumber, current.invoiceNumber),
    poNumber: keep(ex.poNumber, current.poNumber),
    issueDate: keep(ex.issueDate, current.issueDate),
    dueDate: keep(ex.dueDate, current.dueDate),
    currency,
    taxRate: ex.taxRate >= 0 ? ex.taxRate : current.taxRate,
    discount: {
      type: ex.discountType ?? current.discount.type,
      value: ex.discountValue >= 0 ? ex.discountValue : current.discount.value,
    },
    business: {
      ...current.business,
      name: keep(ex.business?.name, current.business.name),
      address: keep(ex.business?.address, current.business.address),
      email: keep(ex.business?.email, current.business.email),
      phone: keep(ex.business?.phone, current.business.phone),
    },
    client: {
      name: keep(ex.client?.name, current.client.name),
      address: keep(ex.client?.address, current.client.address),
      email: keep(ex.client?.email, current.client.email),
    },
    lineItems,
    notes: keep(ex.notes, current.notes),
    terms: keep(ex.terms, current.terms),
  };
}
