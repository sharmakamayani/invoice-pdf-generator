import type { InvoiceData, PaymentStatus } from "./types";
import { computeInvoice } from "./calculations";

// Webhook config is device-local and NOT included in the portable data file —
// webhook URLs (e.g. Zapier catch hooks) often embed secret tokens.
const URL_KEY = "webhook_url";
const ON_KEY = "webhook_enabled";
const TRIG_KEY = "webhook_triggers";

export interface WebhookConfig {
  enabled: boolean;
  url: string;
  triggers: PaymentStatus[];
}

export function getWebhookConfig(): WebhookConfig {
  if (typeof window === "undefined") return { enabled: false, url: "", triggers: ["paid"] };
  let triggers: PaymentStatus[] = ["paid"];
  try {
    const t = JSON.parse(localStorage.getItem(TRIG_KEY) ?? "[]");
    if (Array.isArray(t) && t.length) triggers = t;
  } catch {/* default */}
  return {
    enabled: localStorage.getItem(ON_KEY) === "1",
    url: localStorage.getItem(URL_KEY) ?? "",
    triggers,
  };
}

export function saveWebhookConfig(c: WebhookConfig): void {
  localStorage.setItem(ON_KEY, c.enabled ? "1" : "0");
  localStorage.setItem(URL_KEY, c.url.trim());
  localStorage.setItem(TRIG_KEY, JSON.stringify(c.triggers));
}

const round = (n: number) => Math.round(n * 100) / 100;

export function buildPayload(data: InvoiceData, previousStatus: string) {
  const c = computeInvoice(data);
  return {
    event: "invoice.status_changed",
    status: data.status,
    previousStatus,
    documentType: data.documentType,
    invoiceNumber: data.invoiceNumber,
    poNumber: data.poNumber || null,
    currency: data.currency,
    amounts: {
      subtotal: round(c.subtotal),
      tax: round(c.tax),
      total: round(c.total),
      paid: round(c.paid),
      balance: round(c.balance),
    },
    client: { name: data.client.name, email: data.client.email },
    business: { name: data.business.name, email: data.business.email },
    issueDate: data.issueDate,
    dueDate: data.dueDate,
    paymentLink: data.paymentLink || null,
    timestamp: new Date().toISOString(),
  };
}

export function testPayload() {
  return {
    event: "invoice.status_changed",
    status: "paid",
    previousStatus: "unpaid",
    documentType: "invoice",
    invoiceNumber: "INV-TEST",
    currency: "USD",
    amounts: { subtotal: 100, tax: 0, total: 100, paid: 100, balance: 0 },
    client: { name: "Test Client", email: "test@example.com" },
    business: { name: "Your Business", email: "you@example.com" },
    timestamp: new Date().toISOString(),
    test: true,
  };
}

/** Forward the payload through our server proxy (avoids browser CORS). */
export async function sendWebhook(url: string, payload: unknown): Promise<void> {
  const res = await fetch("/api/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, payload }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Webhook failed (${res.status}).`);
}

/** Fire when status transitions into one of the configured trigger statuses. */
export async function fireOnStatusChange(
  data: InvoiceData,
  previousStatus: string
): Promise<{ sent: boolean; error?: string }> {
  const cfg = getWebhookConfig();
  if (!cfg.enabled || !cfg.url) return { sent: false };
  if (previousStatus === data.status) return { sent: false };
  if (!cfg.triggers.includes(data.status)) return { sent: false };
  try {
    await sendWebhook(cfg.url, buildPayload(data, previousStatus));
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "Webhook failed." };
  }
}
