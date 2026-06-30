import type { Page } from "@playwright/test";
import { makeInvoice } from "../test/fixtures";
import type { InvoiceData } from "@/lib/types";

// A pre-seeded Manager so tests bypass the login screen. The pinHash is never
// verified on session-restore (only at interactive login), so a dummy works.
const MANAGER = { id: "u-mgr", name: "Test Manager", role: "manager", salt: "s", pinHash: "x" };

interface PrepOpts {
  draft?: InvoiceData;
  history?: InvoiceData[];
}

async function prepare(page: Page, opts: PrepOpts = {}) {
  await page.addInitScript((data) => {
    localStorage.clear();
    localStorage.setItem("team_users", JSON.stringify([data.manager]));
    localStorage.setItem("current_user_id", data.manager.id);
    if (data.draft) localStorage.setItem("invoice_draft", JSON.stringify(data.draft));
    if (data.history) localStorage.setItem("invoice_history", JSON.stringify(data.history));
  }, { manager: MANAGER, draft: opts.draft ?? null, history: opts.history ?? null });
}

/** Authenticated session with a seeded draft invoice. */
export async function seedDraft(page: Page, overrides: Partial<InvoiceData> = {}) {
  await prepare(page, { draft: makeInvoice(overrides) });
}

/** Authenticated session with seeded history. */
export async function seedHistory(page: Page, invoices: InvoiceData[]) {
  await prepare(page, { history: invoices });
}

/** Authenticated session, no seeded data. */
export async function authOnly(page: Page) {
  await prepare(page);
}
