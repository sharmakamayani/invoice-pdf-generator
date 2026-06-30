import type { ExtractedInvoice } from "./ocr";

// ───────────────────────────────────────────────────────────────────────────
// Rule-based invoice parser. Turns raw OCR text (from Tesseract) into the same
// structured shape the LLM produces — using regex, keyword anchors, table
// detection, and positional heuristics. No network, no key.
// ───────────────────────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

const SYMBOL_TO_CODE: Record<string, string> = {
  "₹": "INR", "£": "GBP", "€": "EUR", "¥": "JPY", "₩": "KRW", "₽": "RUB", "₪": "ILS", "₺": "TRY",
};

const KNOWN_CODES = [
  "USD", "EUR", "GBP", "INR", "AUD", "CAD", "JPY", "CNY", "AED", "SGD", "CHF",
  "ZAR", "NZD", "HKD", "SEK", "NOK", "DKK", "PLN", "THB", "MYR", "IDR", "PHP", "BRL", "MXN",
];

const NUM_TOKEN = /^[£$€₹¥]?\s*-?\d[\d,]*\.?\d{0,2}$/;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function parseMoney(token: string): number {
  const cleaned = token.replace(/[£$€₹¥,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function matchFirst(text: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) return m[1].trim().replace(/[.,;:]+$/, "");
  }
  return "";
}

// ── Date handling ──────────────────────────────────────────────────────────
function buildDate(y: number, m: number, d: number): string {
  if (m < 1 || m > 12 || d < 1 || d > 31) return "";
  const year = y < 100 ? 2000 + y : y;
  if (year < 1990 || year > 2100) return "";
  return `${year}-${pad(m)}-${pad(d)}`;
}

/** Extract and normalise the first date found in a string → YYYY-MM-DD. */
export function extractDate(s: string): string {
  // ISO: 2026-03-15
  let m = s.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m) return buildDate(+m[1], +m[2], +m[3]);

  // Month-name first: March 15, 2026  /  15 March 2026
  m = s.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/);
  if (m && MONTHS[m[1].toLowerCase()]) return buildDate(+m[3], MONTHS[m[1].toLowerCase()], +m[2]);

  m = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\.?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})\b/);
  if (m && MONTHS[m[2].toLowerCase()]) return buildDate(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);

  // Numeric: 15/03/2026, 03-15-26, 15.03.2026
  m = s.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/);
  if (m) {
    const a = +m[1], b = +m[2], c = +m[3];
    // Disambiguate day vs month
    if (a > 12 && b <= 12) return buildDate(c, b, a); // DD/MM
    if (b > 12 && a <= 12) return buildDate(c, a, b); // MM/DD
    return buildDate(c, b, a); // ambiguous → assume DD/MM (international default)
  }
  return "";
}

function findLabeledDate(lines: string[], labels: RegExp[]): string {
  for (let i = 0; i < lines.length; i++) {
    if (labels.some((re) => re.test(lines[i]))) {
      const sameLine = extractDate(lines[i]);
      if (sameLine) return sameLine;
      // sometimes the value is on the next line
      if (i + 1 < lines.length) {
        const next = extractDate(lines[i + 1]);
        if (next) return next;
      }
    }
  }
  return "";
}

function findAnyDate(lines: string[]): string {
  for (const l of lines) {
    const d = extractDate(l);
    if (d) return d;
  }
  return "";
}

// ── Field detectors ─────────────────────────────────────────────────────────
function detectCurrency(raw: string): string {
  const code = raw.toUpperCase().match(new RegExp(`\\b(${KNOWN_CODES.join("|")})\\b`));
  if (code) return code[1];
  for (const [sym, c] of Object.entries(SYMBOL_TO_CODE)) {
    if (raw.includes(sym)) return c;
  }
  if (raw.includes("$")) return "USD";
  return "";
}

function detectTaxRate(raw: string): number {
  const m =
    raw.match(/(?:tax|vat|gst|sales\s*tax)\b[^%\d]{0,12}(\d{1,2}(?:\.\d+)?)\s*%/i) ||
    raw.match(/(\d{1,2}(?:\.\d+)?)\s*%\s*(?:tax|vat|gst)/i);
  return m ? parseFloat(m[1]) : 0;
}

function detectDiscount(raw: string): { discountValue: number; discountType: "percentage" | "fixed" } {
  const pct = raw.match(/discount\b[^%\d]{0,12}(\d{1,2}(?:\.\d+)?)\s*%/i);
  if (pct) return { discountValue: parseFloat(pct[1]), discountType: "percentage" };
  const fixed = raw.match(/discount\b[^\d£$€₹]{0,12}[£$€₹]?\s*(\d[\d,]*\.?\d{0,2})/i);
  if (fixed) return { discountValue: parseMoney(fixed[1]), discountType: "fixed" };
  return { discountValue: 0, discountType: "percentage" };
}

const PARTY_LABEL = /\b(bill\s*to|billed\s*to|invoice\s*to|sold\s*to|ship\s*to|client|customer|recipient|to\s*:)/i;
const FROM_LABEL = /\b(from|seller|vendor|supplier|issued\s*by|company)\b/i;
const DOC_TITLE = /^(tax\s+)?(invoice|quote|quotation|estimate|proposal|statement|bill)\s*$/i;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /\+?\d[\d\s().\-]{7,}\d/;

function isContactLine(l: string): boolean {
  return EMAIL_RE.test(l) || PHONE_RE.test(l);
}

const BLOCK_STOP = /\b(invoice|quote|quotation|estimate|date|due|total|subtotal|qty|quantity|description|item|amount|rate|price|unit|cost|service|tax|vat|gst)\b/i;

function gatherBlock(lines: string[], start: number, max = 4): string[] {
  const out: string[] = [];
  for (let i = start; i < Math.min(start + max, lines.length); i++) {
    const l = lines[i];
    if (!l) break;
    if (PARTY_LABEL.test(l) || FROM_LABEL.test(l)) break;
    if (out.length > 0 && (BLOCK_STOP.test(l) || DOC_TITLE.test(l))) break;
    // A row with 2+ trailing numbers is almost certainly a line item, not an address.
    if (out.length > 0 && splitTrailingNumbers(l).nums.length >= 2) break;
    out.push(l);
  }
  return out;
}

function detectParties(lines: string[], emails: string[], phones: string[]) {
  const business = { name: "", address: "", email: "", phone: "" };
  const client = { name: "", address: "", email: "" };

  // Client: first PARTY_LABEL block
  const clientIdx = lines.findIndex((l) => PARTY_LABEL.test(l));
  if (clientIdx >= 0) {
    // value may be after the label on the same line
    const inline = lines[clientIdx].replace(PARTY_LABEL, "").replace(/^[:\-\s]+/, "").trim();
    const block = inline ? [inline, ...gatherBlock(lines, clientIdx + 1, 3)] : gatherBlock(lines, clientIdx + 1, 4);
    if (block.length) {
      client.name = block[0];
      client.address = block.slice(1).filter((l) => !isContactLine(l)).join(", ");
      client.email = block.find((l) => EMAIL_RE.test(l))?.match(EMAIL_RE)?.[0] ?? "";
    }
  }

  // Business: FROM block, else top-of-document block
  const fromIdx = lines.findIndex((l) => FROM_LABEL.test(l));
  let bizBlock: string[] = [];
  if (fromIdx >= 0) {
    bizBlock = gatherBlock(lines, fromIdx + 1, 4);
  } else {
    // first non-title, non-date line near the top
    for (let i = 0; i < Math.min(8, lines.length); i++) {
      if (DOC_TITLE.test(lines[i])) continue;
      if (extractDate(lines[i])) continue;
      if (/\b(invoice|quote)\s*(no|#|number)/i.test(lines[i])) continue;
      bizBlock = gatherBlock(lines, i, 4);
      break;
    }
  }
  if (bizBlock.length) {
    business.name = bizBlock[0];
    business.address = bizBlock.slice(1).filter((l) => !isContactLine(l)).join(", ");
  }

  // Contact assignment: business gets the first email/phone, client the next email
  business.email = emails[0] ?? "";
  business.phone = phones[0] ?? "";
  if (!client.email) client.email = emails.find((e) => e !== business.email) ?? "";

  return { business, client };
}

// ── Line-item table extraction ───────────────────────────────────────────────
const HEADER_HINT = /(description|item|service|product)/i;
const COL_HINT = /(qty|quantity|rate|price|unit|amount|total|cost)/i;
const TABLE_END = /(sub\s*-?\s*total|subtotal|total|tax|vat|gst|balance|amount\s*due|grand\s*total|thank\s*you)/i;

function splitTrailingNumbers(row: string): { desc: string; nums: number[] } {
  const tokens = row.split(/\s+/);
  const nums: number[] = [];
  let i = tokens.length - 1;
  while (i >= 0 && NUM_TOKEN.test(tokens[i])) {
    nums.unshift(parseMoney(tokens[i]));
    i--;
  }
  const desc = tokens.slice(0, i + 1).join(" ").replace(/[\s:|–-]+$/, "").trim();
  return { desc, nums };
}

interface ParsedItem { description: string; quantity: number; rate: number }

/** Map a row's trailing numbers to quantity + unit rate. */
function mapNums(nums: number[]): { quantity: number; rate: number } {
  let quantity = 1, rate = 0;
  if (nums.length >= 3) {
    quantity = nums[0] || 1;
    rate = nums[1]; // qty, rate, amount
  } else if (nums.length === 2) {
    const [a, b] = nums;
    if (Number.isInteger(a) && a > 0 && a < 1000 && a <= b) {
      quantity = a;
      rate = b / a; // a = qty, b = amount
    } else {
      quantity = 1;
      rate = a; // a = rate, b = amount
    }
  } else {
    quantity = 1;
    rate = nums[0]; // amount only
  }
  return { quantity, rate: Math.round(rate * 100) / 100 };
}

function inAddress(row: string, addresses: string[]): boolean {
  return addresses.some((a) => {
    if (!a) return false;
    if (a.includes(row) || row.includes(a)) return true;
    const head = a.split(",")[0].trim();
    return head.length > 3 && row.includes(head);
  });
}

/** Header-less fallback: pick out rows that look like priced line items. */
function fallbackLineItems(lines: string[], addresses: string[]): ParsedItem[] {
  const items: ParsedItem[] = [];
  for (const row of lines) {
    if (TABLE_END.test(row)) {
      if (items.length) break;
      continue;
    }
    if (PARTY_LABEL.test(row) || FROM_LABEL.test(row) || DOC_TITLE.test(row)) continue;
    if (EMAIL_RE.test(row) || extractDate(row)) continue;
    if (/\b(invoice|quote|purchase order|p\.?o\.?|phone|tel|email|bill\s*to)\b/i.test(row)) continue;
    if (inAddress(row, addresses)) continue;
    const { desc, nums } = splitTrailingNumbers(row);
    if (!desc || nums.length === 0 || !/[a-zA-Z]{3,}/.test(desc)) continue;
    const { quantity, rate } = mapNums(nums);
    items.push({ description: desc, quantity, rate });
    if (items.length >= 30) break;
  }
  return items;
}

function detectLineItems(lines: string[], addresses: string[] = []): ParsedItem[] {
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const colMatches = (l.match(new RegExp(COL_HINT, "gi")) ?? []).length;
    if ((HEADER_HINT.test(l) && colMatches >= 1) || colMatches >= 2) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return fallbackLineItems(lines, addresses);

  const items: ParsedItem[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const row = lines[i];
    if (TABLE_END.test(row)) break;
    const { desc, nums } = splitTrailingNumbers(row);
    if (!desc || nums.length === 0 || desc.length < 2) continue;
    const { quantity, rate } = mapNums(nums);
    items.push({ description: desc, quantity, rate });
    if (items.length >= 30) break;
  }
  return items;
}

// ── Notes / terms ────────────────────────────────────────────────────────────
function joinAfterTotals(lines: string[], re: RegExp, limit = 4): string {
  const totalIdx = lines.findIndex((l) => /\b(total|balance\s*due|amount\s*due)\b/i.test(l));
  const start = totalIdx >= 0 ? totalIdx : 0;
  const picked: string[] = [];
  for (let i = start; i < lines.length && picked.length < limit; i++) {
    if (re.test(lines[i]) && !/\b(total|subtotal)\b/i.test(lines[i])) picked.push(lines[i]);
  }
  return picked.join(" ");
}

// ── Main entry ───────────────────────────────────────────────────────────────
export function parseInvoiceText(raw: string): ExtractedInvoice {
  const lines = raw.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);

  const documentType: "invoice" | "quote" =
    /\b(quote|quotation|estimate|proposal)\b/i.test(raw.slice(0, 500)) &&
    !/\binvoice\b/i.test(raw.slice(0, 80))
      ? "quote"
      : "invoice";

  const invoiceNumber = matchFirst(raw, [
    /\b(?:invoice|quote|quotation|estimate)\s*(?:no\.?|number|num|#)?\s*[:#]?\s*([A-Z]{0,4}[-\/]?\d{2,}[A-Z0-9\-\/]*)/i,
    /\b(INV[-\s]?\d{2,}[A-Z0-9\-]*)\b/i,
    /\b(QTE[-\s]?\d{2,}[A-Z0-9\-]*)\b/i,
    /#\s*([A-Z0-9][A-Z0-9\-\/]{2,})/,
  ]);

  const poNumber = matchFirst(raw, [
    /\b(?:p\.?\s?o\.?|purchase\s*order)\s*(?:no\.?|number|#)?\s*[:#]?\s*([A-Z0-9][A-Z0-9\-\/]{1,})/i,
  ]);

  const issueDate =
    findLabeledDate(lines, [/issue\s*date/i, /invoice\s*date/i, /date\s*of\s*issue/i, /^date\b/i, /dated/i]) ||
    findAnyDate(lines);
  const dueDate = findLabeledDate(lines, [/due\s*date/i, /payment\s*due/i, /\bdue\b/i, /valid\s*until/i, /pay\s*by/i, /expires/i]);

  const currency = detectCurrency(raw);
  const taxRate = detectTaxRate(raw);
  const { discountValue, discountType } = detectDiscount(raw);

  const emails = [...raw.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+/g)].map((m) => m[0]);
  const phones = [...raw.matchAll(/\+?\d[\d\s().\-]{7,}\d/g)]
    .map((m) => m[0].trim())
    // Exclude date-like strings (e.g. 2026-01-09) that match the phone pattern
    .filter((p) => !extractDate(p) && p.replace(/\D/g, "").length >= 7);

  const { business, client } = detectParties(lines, emails, phones);
  const lineItems = detectLineItems(lines, [business.address, client.address]);

  const notes = joinAfterTotals(lines, /(payment|terms|due within|net\s*\d+|thank you|please pay|bank|account|iban|swift|paypal)/i);
  const terms = joinAfterTotals(lines, /(terms|conditions|late|interest|property|liability|warranty)/i);

  return {
    documentType, invoiceNumber, poNumber, issueDate, dueDate, currency,
    taxRate, discountValue, discountType, business, client, lineItems, notes, terms,
  };
}

// ── Receipt parsing (for expense scanning) ──────────────────────────────────
export interface ParsedReceipt {
  vendor: string;
  date: string;
  total: number;
  tax: number;
  currency: string;
  category: string;
}

function amountsIn(s: string): number[] {
  return [...s.matchAll(/[£$€₹¥]?\s?(\d[\d,]*\.\d{2})/g)].map((m) => parseMoney(m[1]));
}

export function parseReceiptText(raw: string): ParsedReceipt {
  const lines = raw.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);

  const vendor = lines.find((l) => /[a-zA-Z]{3,}/.test(l) && !extractDate(l) && !/receipt|invoice|tax/i.test(l)) ?? "";

  let date = "";
  for (const l of lines) { const d = extractDate(l); if (d) { date = d; break; } }

  const currency = detectCurrency(raw);

  // Total: prefer a line labelled total/amount due; else the largest amount.
  let total = 0;
  for (const l of lines) {
    if (/\b(grand\s*total|total\s*due|amount\s*due|balance\s*due|total|amount)\b/i.test(l)) {
      const a = amountsIn(l);
      if (a.length) total = a[a.length - 1];
    }
  }
  if (!total) {
    const all = lines.flatMap(amountsIn);
    if (all.length) total = Math.max(...all);
  }

  let tax = 0;
  for (const l of lines) {
    if (/\b(tax|vat|gst)\b/i.test(l)) {
      const a = amountsIn(l);
      if (a.length) tax = a[a.length - 1];
    }
  }

  return { vendor, date, total, tax, currency, category: "other" };
}
