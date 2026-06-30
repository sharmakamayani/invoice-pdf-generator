import { describe, it, expect } from "vitest";
import { dueDateFromTerm, getTerm } from "@/lib/paymentTerms";

describe("dueDateFromTerm", () => {
  it("adds the right number of days for net terms", () => {
    expect(dueDateFromTerm("2026-06-01", "net7")).toBe("2026-06-08");
    expect(dueDateFromTerm("2026-06-01", "net30")).toBe("2026-07-01");
    expect(dueDateFromTerm("2026-06-01", "net90")).toBe("2026-08-30");
  });
  it("returns the same day for due-on-receipt", () => {
    expect(dueDateFromTerm("2026-06-01", "receipt")).toBe("2026-06-01");
  });
  it("returns null for custom (keep existing date)", () => {
    expect(dueDateFromTerm("2026-06-01", "custom")).toBeNull();
  });
  it("returns null for an invalid issue date", () => {
    expect(dueDateFromTerm("not-a-date", "net30")).toBeNull();
  });
});

describe("getTerm", () => {
  it("falls back to net30 for unknown values", () => {
    expect(getTerm("nonsense").value).toBe("net30");
  });
});
