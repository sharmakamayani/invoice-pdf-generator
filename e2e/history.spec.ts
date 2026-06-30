import { test, expect } from "@playwright/test";
import { seedDraft } from "./helpers";

test("saving an invoice adds it to history", async ({ page }) => {
  await seedDraft(page, { invoiceNumber: "INV-555" });
  await page.goto("/");
  // Wait for the seeded draft to hydrate into the form before saving.
  await expect(page.getByRole("textbox").first()).toHaveValue("INV-555");

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "History", exact: true }).click();

  await expect(page.getByText(/INV-555/).first()).toBeVisible();
});

test("loading from history returns to the editor", async ({ page }) => {
  await seedDraft(page, { invoiceNumber: "INV-556" });
  await page.goto("/");
  await expect(page.getByRole("textbox").first()).toHaveValue("INV-556");

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await page.getByRole("button", { name: "Load", exact: true }).first().click();

  // Back on the editor: the document type toggle is visible.
  await expect(page.getByRole("button", { name: "invoice", exact: true })).toBeVisible();
});
