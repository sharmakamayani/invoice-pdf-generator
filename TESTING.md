# Testing Guide — Billa

This document covers the automated test strategy and the **detailed manual test
steps** for the parts that can't (or shouldn't) be automated.

## Running the automated suite

```bash
npm test            # Vitest — Layers 1 & 2 (unit + API), ~5s
npm run test:watch  # watch mode
npm run test:coverage
npm run test:e2e    # Playwright — Layer 3 (browser happy-paths)
```

Status: **64 Vitest tests (14 files) + 7 Playwright tests, all green** (Layers 1–3 implemented).
Stack: Vitest + jsdom, `@vitejs/plugin-react` for JSX in `.tsx` route/pdf files,
`@` path alias mirrored from `tsconfig`. API-route specs declare
`// @vitest-environment node` at the top. LLM and webhook network calls are mocked
(`vi.stubGlobal("fetch", …)`) — no real keys or endpoints are hit.

---

## Test Strategy Overview

Three layers, in order of value-for-effort:

| Layer | What | Tool | Automated? |
|---|---|---|---|
| 1. Unit | Pure logic in `lib/` | Vitest | ✅ Fully |
| 2. Functional | API route handlers | Vitest + fetch / mocked LLM | ✅ Mostly |
| 3. E2E | UI flows in the browser | Playwright | ✅ Happy-paths |
| 4. Manual | LLM OCR accuracy, visual/PDF polish, file-on-drive storage, live webhooks | Human | ❌ See below |

---

## Layer 1 — Unit Tests (automated) ✅ implemented

Pure, deterministic functions — no mocks needed. Implemented in `test/`:

- `lib/calculations.ts` — `computeInvoice` (subtotal → discount → tax → late fee →
  deposit → payments → balance), `isOverdue`. Cover: 0%/fixed/percentage discount,
  tax on/off, late fee only when overdue, partial payments, paid-in-full.
- `lib/invoiceParser.ts` — `parseInvoiceText`, `extractDate`. Fixtures: UK invoice,
  US quote ($), header-less receipt, plus edge cases (DD vs MM dates, missing
  fields, computed unit rate from line total, currency symbol inference).
- `lib/share.ts` — `encodeInvoice` → `decodeInvoice` round-trip equals original.
- `lib/paymentTerms.ts` — `dueDateFromTerm` for net7/14/30/60/90, receipt, custom.
- `lib/recurring.ts` — generates only when next cycle is due; not before.
- `lib/currencies.ts` — `getSymbol` for known/unknown codes.
- `lib/exports.ts` — CSV row count + escaping of commas/quotes.
- `lib/fileSync.ts` — `snapshot()`/`restore()` round-trip preserves all sync keys;
  `importJson` rejects files missing `_app: "invoice-generator"`; `getBackend`
  defaults to `local`; API-key keys are **excluded** from the snapshot. (Runs in
  jsdom; mock `localStorage`. The File System Access calls are manual — Layer 4.)
- `lib/webhook.ts` — `buildPayload` shape (event, status, amounts, client/business,
  timestamp); `fireOnStatusChange` only sends when **enabled + url set + status
  actually changed + new status is in `triggers`** (assert it stays silent
  otherwise). Mock `fetch`.
- `lib/projectStats.ts` — `projectStats` sums invoiced (linked invoice totals),
  time value (hours × rate), and expenses; `overBudget` true only when
  `cost > budget`. Seed localStorage fixtures.
- `lib/invoiceParser.ts` → `parseReceiptText` — extracts vendor (first non-date
  line), date, currency, total (prefers a "total"-labelled line, else max amount),
  tax. Fixtures: clean receipt, no-label receipt, symbol-only currency.
- `lib/storage.ts` — projects & expenses save/load/delete round-trip; both keys
  are in `fileSync` `SYNC_KEYS` (so they back up).
- `lib/auth.ts` — `can(role, perm)` matrix: manager = full; lead = dashboard/
  exports/delete but no team/settings; agent = edit records only.

## Layer 2 — Functional / API (automated, mock the LLM) ✅ implemented

- `POST /api/generate-pdf` — response starts with `%PDF`, size > 0, for all 3
  templates (modern/minimal/corporate) and invoice + quote.
- `POST /api/tax-report` — same `%PDF` assertion.
- `POST /api/ocr` — **mock provider calls** (do not use real keys):
  - no key → `400`
  - OpenAI + PDF → friendly guard message
  - provider routing picks the right branch
  - real LLM call is a manual smoke test (Layer 4), not part of CI.
- `POST /api/webhook` — invalid/empty URL → `400`; valid URL forwards the payload
  (assert against an echo endpoint like `httpbin.org/post`, or mock `fetch`);
  unreachable/slow endpoint → `502` (8s timeout).
- `POST /api/receipt` — returns a valid PDF (`%PDF`, size > 0) for a paid invoice.
- `POST /api/ocr` with `kind: "receipt"` — mocked: routes to the receipt extractor
  (vendor/date/total/tax/currency/category); no key → `400`.

## Layer 3 — E2E (automated) ✅ implemented

Playwright (Chromium) in `e2e/`. `playwright.config.ts` boots the dev server via
`webServer` (reuses one if already running). Tests seed state by injecting
`localStorage` with `page.addInitScript` (see `e2e/helpers.ts`) — no clicking
through forms to set up data. Implemented happy-paths:

- `editor.spec.ts` — seeded line items + tax → total recomputes; **Download PDF**
  triggers a real download whose bytes start with `%PDF`.
- `history.spec.ts` — Save → invoice appears in History → Load returns to editor.
  (Waits for the seeded draft to hydrate before saving — avoids a load race.)
- `ui.spec.ts` — dark-mode toggle adds/removes `.dark-mode`; scan modal shows the
  API-key field for cloud providers and a "runs free" note for Tesseract; Export
  JSON downloads a backup file.

Still manual (native dialogs / non-determinism): the File System Access picker,
real OCR accuracy, live webhook delivery — covered in Layer 4 below.

---

## Layer 4 — Manual Test Steps

Run these by hand each release. Dev server: `npm run dev` (note the port).

### A. Invoice editor & live preview
1. Open the app → **Editor** tab.
2. Fill Business + Client details. ✔ Preview pane updates.
3. Add 3 line items with qty/rate. ✔ Amounts = qty × rate; subtotal correct.
4. Set tax 18%, discount 10%. ✔ Totals row shows discount (−) then tax then total.
5. Toggle **Invoice ↔ Quote**. ✔ Number prefix flips INV-/QTE-; due date hides for quote.
6. Click **Refresh Preview** → ✔ PDF renders in the iframe.

### B. PDF templates, watermark, branding
7. In Branding, switch template **Modern → Minimal → Corporate**, refresh each.
   ✔ Layout changes; brand colour applied.
8. Set watermark **PAID / DRAFT / CONFIDENTIAL**. ✔ Diagonal watermark in PDF.
9. Upload a logo. ✔ Logo appears top-left in PDF.
10. Change font (Helvetica/Times/Courier). ✔ PDF font changes.
11. Switch language ES/FR/DE. ✔ PDF labels translate.

### C. Money features
12. Enable **deposit 50%** → ✔ "Deposit Due" line in totals + PDF.
13. Enable **late fee 5%**, set due date in the past, status not paid →
    ✔ late fee appears; status badge shows **overdue**.
14. Record a **partial payment** → ✔ Paid + Balance Due update everywhere.
15. Add a **payment link** → ✔ "Pay Now" button shows on the PDF and links out.
16. **Currency converter** → pick EUR, Convert → ✔ shows live (or offline) rate.

### D. History, clients, recurring
17. **Save** an invoice → **History** tab → ✔ it's listed with status.
18. **Load** it → ✔ form repopulates. **Duplicate** → ✔ new number, status draft.
19. Filters All/Unpaid/Overdue/Paid → ✔ list filters correctly.
20. **Send reminder** on an unpaid invoice → ✔ email draft opens, CC = your email.
21. **Clients** tab → Save current client → Use → ✔ fills the form.
22. Mark an invoice **recurring (Monthly)**, save, set its issue date >30 days ago,
    reload the app → ✔ banner: "N recurring invoices auto-generated".

### E. Time tracking
23. **Time** tab → Start timer, wait, **Save Entry** → ✔ entry logged with value.
24. **Add all to invoice** → ✔ entries become line items (hours × rate), tab → Editor.

### F. Sharing & public view
25. **Share** → ✔ "link copied" toast. Paste link in a new tab → ✔ /view renders
    the document read-only.
26. On a **quote** share link → click **Accept Quote** → ✔ badge turns "Accepted".
27. **Download PDF** from the public view → ✔ correct PDF.

### G. Exports
28. **Dashboard** tab → ✔ revenue cards, aged receivables, client revenue, tax total.
29. **Export CSV** → ✔ file downloads; opens in Excel with correct columns.
30. **Tax Report PDF** → ✔ formatted report with totals.

### H. OCR scan (provider matrix)
For each provider you have a key for — and **Tesseract (no key)**:
31. **⎙ Scan** → pick provider → enter key (cloud) → upload a clear invoice image.
    ✔ Fields populate; **spot-check totals, dates, currency, line-item rates**.
32. Try a **PDF** with OpenAI selected → ✔ friendly "use Claude/Gemini" message.
33. **Tesseract** on a clean typed invoice → ✔ number/dates/items extracted;
    on a messy photo → expect partial extraction (document what it misses).
34. No key entered (cloud provider) → ✔ upload + Scan stay disabled.

> **OCR accuracy is inherently non-deterministic** — record pass/fail per sample
> invoice in a tracking sheet rather than asserting exact equality.

### I. Dark mode
35. Toggle **☾ Dark** → ✔ cards, inputs, History/Clients, and the scan modal all
    go dark (no white frames); selected chips stay readable.

### J. Cross-cutting
36. Reload mid-edit → ✔ draft auto-restores (autosave).
37. Resize to mobile width → ✔ Edit/Preview toggle appears and works.

### K. Data storage & backup (💾 Data)
> File-on-drive needs **Chrome or Edge** (File System Access API). Export/Import
> works in every browser.

**Universal backup (any browser)**
38. Create/save a couple of invoices. **💾 Data → Export JSON** → ✔ a
    `invoice-backup-YYYY-MM-DD.json` downloads.
39. **Import JSON** that file in a fresh browser/profile → ✔ invoices, clients,
    catalog, and counters reappear after reload.
40. Import a non-backup `.json` → ✔ friendly "doesn't look like a backup" error.

**Local file backend (Chrome/Edge)**
41. **💾 Data → A file on your drive → Create new file…** → choose a location →
    ✔ "Connected & saved"; the file exists on disk with your data.
42. Edit an invoice, wait ~1s → reopen the file in a text editor → ✔ the JSON
    reflects the change (debounced auto-save).
43. **Close the tab, reopen the app** → ✔ data loads from the file (grant the
    one-time permission prompt if shown).
44. **Open existing…** and pick the file on **another machine/browser** → ✔
    "Loaded its data"; everything appears after reload.
45. **Cloud-folder sync:** save the file inside a Dropbox/Drive/OneDrive folder,
    edit on device A, let it sync, **Load** on device B → ✔ changes appear.
46. **Disconnect** → ✔ reverts to browser storage; the file is left untouched.
47. Switch backend to **This browser** → ✔ new edits no longer write to the file.

**Privacy**
48. Inspect an exported/saved file → ✔ it contains invoices/clients/etc. but
    **no API keys** (`llm_key_*` are intentionally excluded).

### L. Webhook on status change (⚙ Settings → Webhook)
> Use a free inspector like **webhook.site** or **httpbin.org/post** as the
> target URL. The app server must be running (POST is proxied via `/api/webhook`).
49. **⚙ Settings → Webhook** → toggle on, paste your webhook.site URL → **Send
    test** → ✔ "delivered ✓" toast and the inspector shows the test JSON payload.
50. Leave triggers = **Paid** only. In the editor, change an invoice status
    **Unpaid → Paid** → ✔ webhook fires; inspector shows real invoice data
    (number, status, previousStatus, amounts, client, timestamp).
51. Change status **Paid → Unpaid → Paid** → ✔ fires each time it *enters* Paid.
52. Set status to **Overdue** while only Paid is a trigger → ✔ does **not** fire.
53. Add **Accepted** as a trigger, set a quote to that status → ✔ fires.
54. Toggle the webhook **off** → change status → ✔ nothing sent.
55. Enter a bad URL → Send test → ✔ friendly error; unreachable host → ✔ `502`
    surfaced as an error toast (8s timeout).
56. **Load** an already-Paid invoice from History into the editor → ✔ does **not**
    fire (only user-initiated transitions trigger it, not loading).
57. Inspect an exported data file → ✔ the **webhook URL is not included**
    (it can contain secret tokens).

---

### M. Projects (Projects tab)
58. **Projects → New project** → name, client, budget, currency → Save → ✔ card
    shows Budget / Invoiced / Cost / Remaining with a progress bar.
59. In the editor, set an invoice's **Project** = this project, Save → reopen
    Projects → ✔ "Invoiced" reflects the invoice total.
60. **Time** tab → log time with the project selected → ✔ project "Cost" rises.
61. **Expenses** → add an expense tagged to the project → ✔ "Cost" rises.
62. Push cost beyond budget → ✔ **⚠ Over budget** badge + red bar.

### N. Expenses & receipt scanning (Expenses tab)
63. **Expenses → New expense** → fill vendor/amount/category → Save → ✔ listed;
    currency-total chips appear.
64. **⎙ Scan receipt** → choose **Tesseract (free)** → upload a clear receipt image
    → ✔ vendor / total / date / currency auto-fill (spot-check the amount).
65. Scan with a **cloud provider** (if a key is set) → ✔ higher accuracy; the
    receipt image is attached to the expense (thumbnail shown).
66. Mark an expense **billable**, tag a client → ✔ saved.

### O. Payment receipt PDF
67. Open/Load an invoice, record payment(s) so **balance = 0** → ✔ a green
    **🧾 Receipt** button appears in the preview toolbar.
68. Click it → ✔ `Receipt-INV-xxx.pdf` downloads with a **PAID** stamp, amount paid,
    method, and balance 0.
69. Reduce payments so a balance remains → ✔ the Receipt button disappears.

### P. Bulk actions (History)
70. Select 2–3 invoices via checkboxes (or **Select all**) → ✔ blue action bar
    shows the count.
71. **Export CSV** → ✔ a CSV of only the selected invoices downloads.
72. **Email** → ✔ one mail draft opens per selected invoice that has a client email.
73. **Delete** → confirm → ✔ selected invoices removed; selection clears.

### Q. E-signature
74. Editor → signature section → **Draw** → draw with mouse/touch → ✔ "Signature
    captured"; generate PDF → ✔ the drawn mark appears above the signature line.
75. Switch to **Type** → type a name → ✔ a script-style signature renders in the PDF.
76. Open the **share link** for a signed invoice → ✔ the signature shows on /view.
77. **Clear** → ✔ signature removed from the PDF.

### R. PWA / offline (Chrome/Edge)
78. Load the app → DevTools ▸ Application ▸ **Service Workers** → ✔ `sw.js` is
    activated; **Manifest** shows name/icon with no errors.
79. An **⬇ Install app** button appears (or the address-bar install icon) → install
    → ✔ opens as a standalone window.
80. Go **offline** (DevTools ▸ Network ▸ Offline) → reload → ✔ the app still loads
    and you can view/edit data. (PDF/OCR/webhook need the network — expected.)

### S. Access management — roles (Manager / Team Lead / Agent)
> Device-local role access: a login screen gates the UI; permissions hide
> features per role. (Not server-enforced security — see the in-app note.)
81. **First run** (fresh browser / cleared data) → ✔ "Create your account" screen;
    name + 4-digit PIN → ✔ you're created as **Manager** and signed in.
82. Header shows your name + **Manager**, plus **⚙ Settings**, **Team** tab and
    **Sign out**.
83. **Team** tab → **Add member** → create a **Team Lead** and an **Agent** (each
    with a PIN).
84. **Sign out** → ✔ login screen lists the three users → sign in as the **Agent**
    (its PIN) → ✔ no **Dashboard**, no **Team** tab, no **⚙ Settings**; **Delete**
    buttons hidden in History.
85. Sign out → sign in as **Team Lead** → ✔ Dashboard + exports + Delete visible,
    but no **Team** tab and no **⚙ Settings**.
86. Sign in as **Manager** → Team tab → change a role / reset a PIN / remove a
    member → ✔ blocked from removing the last Manager or deleting yourself.
87. **Wrong PIN** → ✔ "Incorrect PIN"; correct PIN signs in.
88. With a **local data file** connected (Settings → file), the team travels with
    the file — open it on another browser and the same users appear at login.

## Suggested CI order
1. `vitest run` (layers 1–2) on every push — fast, deterministic.
2. `playwright test` (layer 3) on PRs.
3. Manual checklist (layer 4) before each release / deploy.
