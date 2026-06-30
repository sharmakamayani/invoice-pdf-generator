import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

// ── Shared extraction shape ───────────────────────────────────────────────
const ExtractedInvoice = z.object({
  documentType: z.enum(["invoice", "quote"]),
  invoiceNumber: z.string(),
  poNumber: z.string(),
  issueDate: z.string(),
  dueDate: z.string(),
  currency: z.string(),
  taxRate: z.number(),
  discountValue: z.number(),
  discountType: z.enum(["percentage", "fixed"]),
  business: z.object({
    name: z.string(),
    address: z.string(),
    email: z.string(),
    phone: z.string(),
  }),
  client: z.object({
    name: z.string(),
    address: z.string(),
    email: z.string(),
  }),
  lineItems: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      rate: z.number(),
    })
  ),
  notes: z.string(),
  terms: z.string(),
});

// Plain JSON Schema for providers that take a JSON schema directly.
const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    documentType: { type: "string", enum: ["invoice", "quote"] },
    invoiceNumber: { type: "string" },
    poNumber: { type: "string" },
    issueDate: { type: "string" },
    dueDate: { type: "string" },
    currency: { type: "string" },
    taxRate: { type: "number" },
    discountValue: { type: "number" },
    discountType: { type: "string", enum: ["percentage", "fixed"] },
    business: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" }, address: { type: "string" },
        email: { type: "string" }, phone: { type: "string" },
      },
      required: ["name", "address", "email", "phone"],
    },
    client: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" }, address: { type: "string" }, email: { type: "string" },
      },
      required: ["name", "address", "email"],
    },
    lineItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          description: { type: "string" }, quantity: { type: "number" }, rate: { type: "number" },
        },
        required: ["description", "quantity", "rate"],
      },
    },
    notes: { type: "string" },
    terms: { type: "string" },
  },
  required: [
    "documentType", "invoiceNumber", "poNumber", "issueDate", "dueDate", "currency",
    "taxRate", "discountValue", "discountType", "business", "client", "lineItems", "notes", "terms",
  ],
} as const;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const PROMPT = `You are an invoice and quote data extraction system. Read the attached document and extract its fields precisely.

Rules:
- Normalise every date to YYYY-MM-DD format. If a date is missing, return an empty string.
- "currency" must be the 3-letter ISO code (e.g. USD, EUR, GBP, INR). Infer it from currency symbols if no code is printed.
- For each line item, "rate" is the price PER UNIT, not the line total. If only a line total and quantity are shown, divide to get the unit rate.
- "taxRate" is the tax percentage as a number (e.g. 18 for 18%). If a tax amount is shown but not a rate, compute the rate from the subtotal.
- Set "documentType" to "quote" if the document is titled Quote/Quotation/Estimate/Proposal, otherwise "invoice".
- For any field you cannot find, return an empty string (or 0 for numbers). Never invent data.`;

// ── Receipt extractor (for expense scanning) ───────────────────────────────
const EXPENSE_CATEGORIES = ["software", "hardware", "travel", "meals", "office", "marketing", "subcontractor", "fees", "other"] as const;

const ExtractedReceipt = z.object({
  vendor: z.string(),
  date: z.string(),
  total: z.number(),
  tax: z.number(),
  currency: z.string(),
  category: z.enum(EXPENSE_CATEGORIES),
});

const RECEIPT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    vendor: { type: "string" },
    date: { type: "string" },
    total: { type: "number" },
    tax: { type: "number" },
    currency: { type: "string" },
    category: { type: "string", enum: EXPENSE_CATEGORIES },
  },
  required: ["vendor", "date", "total", "tax", "currency", "category"],
} as const;

const RECEIPT_PROMPT = `You are a receipt data extraction system. Read the attached receipt and extract its fields.

Rules:
- "vendor" is the merchant/store name (usually at the top).
- "date" → YYYY-MM-DD. Empty string if missing.
- "total" is the FINAL amount paid including tax (the grand total), as a number.
- "tax" is the tax/VAT/GST amount as a number (0 if none shown).
- "currency" → 3-letter ISO code, inferred from symbols if needed.
- "category" → choose the best fit from: ${EXPENSE_CATEGORIES.join(", ")}.
- Never invent data; use empty string / 0 when unsure.`;

interface Extractor {
  name: string;
  prompt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  zod: any;
  jsonSchema: object;
}
const INVOICE_EXTRACTOR: Extractor = { name: "invoice_extraction", prompt: PROMPT, zod: ExtractedInvoice, jsonSchema: JSON_SCHEMA };
const RECEIPT_EXTRACTOR: Extractor = { name: "receipt_extraction", prompt: RECEIPT_PROMPT, zod: ExtractedReceipt, jsonSchema: RECEIPT_JSON_SCHEMA };

function ok(data: unknown) {
  return Response.json({ data });
}
function fail(error: string, status: number) {
  return Response.json({ error }, { status });
}

// ── Provider implementations ──────────────────────────────────────────────
async function runAnthropic(apiKey: string, model: string, base64: string, mediaType: string, ex: Extractor) {
  const client = new Anthropic({ apiKey });
  const fileBlock: Anthropic.ContentBlockParam =
    mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: (IMAGE_TYPES.includes(mediaType) ? mediaType : "image/png") as
              | "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: base64,
          },
        };

  const response = await client.messages.parse({
    model: model || "claude-opus-4-8",
    max_tokens: 2048,
    messages: [{ role: "user", content: [fileBlock, { type: "text", text: ex.prompt }] }],
    output_config: { format: zodOutputFormat(ex.zod) },
  });
  if (!response.parsed_output) throw new Error("Could not read structured data from this document.");
  return response.parsed_output;
}

async function runOpenAI(apiKey: string, model: string, base64: string, mediaType: string, ex: Extractor) {
  if (mediaType === "application/pdf") {
    throw new Error("OpenAI's vision endpoint does not accept PDFs. Upload an image (PNG/JPG), or use Claude or Gemini for PDFs.");
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: ex.prompt },
            { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64}` } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: ex.name, strict: true, schema: ex.jsonSchema },
      },
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `OpenAI error (${res.status}).`);
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no content.");
  return JSON.parse(content);
}

async function runGemini(apiKey: string, model: string, base64: string, mediaType: string, ex: Extractor) {
  const m = model || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${ex.prompt}\n\nReturn ONLY a JSON object matching this schema:\n${JSON.stringify(ex.jsonSchema)}` },
            { inline_data: { mime_type: mediaType, data: base64 } },
          ],
        },
      ],
      generationConfig: { response_mime_type: "application/json", temperature: 0 },
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Gemini error (${res.status}).`);
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content.");
  return JSON.parse(text);
}

// ── Route ─────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  let body: { provider?: string; apiKey?: string; model?: string; base64?: string; mediaType?: string; kind?: string };
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request body.", 400);
  }

  const { provider, apiKey, model = "", base64, mediaType, kind } = body;
  if (!apiKey || !apiKey.trim()) return fail("An API key is required. Add one in the scan window before scanning.", 400);
  if (!base64 || !mediaType) return fail("Missing file data.", 400);

  const ex = kind === "receipt" ? RECEIPT_EXTRACTOR : INVOICE_EXTRACTOR;

  try {
    let data: unknown;
    if (provider === "openai") data = await runOpenAI(apiKey.trim(), model, base64, mediaType, ex);
    else if (provider === "google") data = await runGemini(apiKey.trim(), model, base64, mediaType, ex);
    else data = await runAnthropic(apiKey.trim(), model, base64, mediaType, ex);
    return ok(data);
  } catch (err) {
    const message =
      err instanceof Anthropic.APIError
        ? `Claude API error (${err.status}): ${err.message}`
        : err instanceof Error
        ? err.message
        : "Unknown error during extraction.";
    // 401-ish auth errors → 400 so the UI prompts to fix the key
    const status = /api key|unauthor|401|invalid.*key|authentication/i.test(message) ? 401 : 502;
    return fail(message, status);
  }
}
