import { describe, it, expect } from "vitest";
import { encodeInvoice, decodeInvoice } from "@/lib/share";
import { makeInvoice } from "./fixtures";

describe("share encode/decode", () => {
  it("round-trips an invoice", () => {
    const inv = makeInvoice({ invoiceNumber: "INV-777", notes: "Café — 50% déjà payé ✓" });
    const decoded = decodeInvoice(encodeInvoice(inv));
    expect(decoded).not.toBeNull();
    expect(decoded!.invoiceNumber).toBe("INV-777");
    expect(decoded!.notes).toBe("Café — 50% déjà payé ✓");
    expect(decoded!.lineItems).toEqual(inv.lineItems);
  });

  it("strips the qr image from the payload", () => {
    const inv = makeInvoice({ qrData: "data:image/png;base64,AAAA" });
    expect(decodeInvoice(encodeInvoice(inv))!.qrData).toBeUndefined();
  });

  it("produces url-safe output (no + / =)", () => {
    const encoded = encodeInvoice(makeInvoice());
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("returns null for garbage input", () => {
    expect(decodeInvoice("not-valid-base64!!")).toBeNull();
  });
});
