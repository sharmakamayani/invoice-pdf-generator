import { test, expect } from "@playwright/test";
import { seedDraft, authOnly } from "./helpers";

test("dark mode toggle applies the dark theme", async ({ page }) => {
  await authOnly(page);
  await page.goto("/");
  await expect(page.locator(".dark-mode")).toHaveCount(0);
  await page.getByTitle("Toggle dark mode").click();
  await expect(page.locator(".dark-mode")).toHaveCount(1);
  await page.getByTitle("Toggle dark mode").click();
  await expect(page.locator(".dark-mode")).toHaveCount(0);
});

test("scan modal requires an API key for cloud providers", async ({ page }) => {
  await authOnly(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Scan/ }).click();

  await expect(page.getByText("Scan an Invoice")).toBeVisible();
  // Default provider is Claude → an API key field is shown.
  await expect(page.getByPlaceholder("sk-ant-...")).toBeVisible();

  // Switch to Tesseract (free) → no key field, a "runs free" note appears.
  await page.getByRole("button", { name: /Tesseract/ }).click();
  await expect(page.getByText(/Runs free, entirely in your browser/)).toBeVisible();
  await expect(page.getByPlaceholder("sk-ant-...")).toHaveCount(0);
});

test("export JSON downloads a backup file", async ({ page }) => {
  await seedDraft(page);
  await page.goto("/");
  await page.getByTitle("Settings, backup & integrations").click();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Export JSON/ }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/invoice-backup-.*\.json/);
});
