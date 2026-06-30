import { describe, it, expect } from "vitest";
import { getSymbol, currencies } from "@/lib/currencies";

describe("getSymbol", () => {
  it("returns the symbol for a known code", () => {
    expect(getSymbol("USD")).toBe("$");
    expect(getSymbol("GBP")).toBe("£");
    expect(getSymbol("INR")).toBe("₹");
  });
  it("falls back to $ for an unknown currency", () => {
    expect(getSymbol("ZZZ")).toBe("$");
  });
  it("ships a broad currency list", () => {
    expect(currencies.length).toBeGreaterThan(100);
  });
});
