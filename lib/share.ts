import type { InvoiceData } from "./types";

/**
 * Encode an invoice into a URL-safe base64 string for a shareable link.
 * The full invoice travels in the URL fragment, so no backend/database is
 * needed — the public view page decodes it client-side.
 */
export function encodeInvoice(data: InvoiceData): string {
  // Strip the (potentially huge) logo data URL to keep links manageable.
  const slim: InvoiceData = {
    ...data,
    qrData: undefined,
  };
  const json = JSON.stringify(slim);
  const utf8 = encodeURIComponent(json);
  const b64 = btoa(unescape(utf8));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeInvoice(encoded: string): InvoiceData | null {
  try {
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const utf8 = escape(atob(b64));
    const json = decodeURIComponent(utf8);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function buildShareUrl(data: InvoiceData): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/view#${encodeInvoice(data)}`;
}
