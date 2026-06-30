import type { ExtractedInvoice, ExtractedReceipt } from "./ocr";
import { parseInvoiceText, parseReceiptText } from "./invoiceParser";

export interface TesseractResult {
  extracted: ExtractedInvoice;
  rawText: string;
}

async function recognise(file: File, onProgress?: (pct: number, stage: string) => void): Promise<string> {
  if (file.type === "application/pdf") {
    throw new Error("Tesseract reads images only. Export the receipt/invoice as a PNG/JPG, or use Claude/Gemini for PDFs.");
  }
  const Tesseract = (await import("tesseract.js")).default;
  const { data } = await Tesseract.recognize(file, "eng", {
    logger: (m: { status: string; progress: number }) => {
      if (onProgress) onProgress(Math.round((m.progress ?? 0) * 100), m.status ?? "");
    },
  });
  return data.text ?? "";
}

/**
 * Run free, in-browser OCR with Tesseract.js, then apply the rule-based
 * parser. No API key, no network calls to any LLM provider.
 */
export async function runTesseract(
  file: File,
  onProgress?: (pct: number, stage: string) => void
): Promise<TesseractResult> {
  const rawText = await recognise(file, onProgress);
  const extracted = parseInvoiceText(rawText);
  return { extracted, rawText };
}

export async function runTesseractReceipt(
  file: File,
  onProgress?: (pct: number, stage: string) => void
): Promise<{ extracted: ExtractedReceipt; rawText: string }> {
  const rawText = await recognise(file, onProgress);
  return { extracted: parseReceiptText(rawText), rawText };
}
