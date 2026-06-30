import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { seedDraft } from "./helpers";

test("totals reflect the seeded line items and tax", async ({ page }) => {
  await seedDraft(page, { taxRate: 10 }); // 2 × 100 + 10% = 220
  await page.goto("/");
  await expect(page.getByText("$220.00").first()).toBeVisible();
});

test("downloads a PDF of the invoice", async ({ page }) => {
  await seedDraft(page);
  await page.goto("/");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Download PDF/i }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  const path = await download.path();
  const bytes = readFileSync(path);
  expect(bytes.subarray(0, 4).toString("latin1")).toBe("%PDF");
});
