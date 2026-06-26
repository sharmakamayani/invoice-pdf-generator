# Requirement Verification Questions — Invoice & PDF Generator

**Instructions**: Answer each question by filling in the `[Answer]:` tag below each question.
Use the letter (A, B, C…) or write freely for X (Other).

---

## Q1: PDF Generation Engine
Which approach should be used to generate PDFs?

A) `@react-pdf/renderer` — renders React components directly to PDF (recommended, no browser needed, fast)
B) `Puppeteer` — headless Chrome takes a screenshot of the HTML preview (pixel-perfect but slower, heavier)
C) `jsPDF` — lightweight client-side JavaScript PDF library (simpler but less control over layout)
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Q2: Invoice Storage
Should the tool save invoice history so the user can come back and find past invoices?

A) No storage — generate and download, nothing saved (simplest, works without a database)
B) Browser localStorage — saves in the user's browser only, no account needed
C) Supabase (cloud database) — full history, accessible from any device, requires login
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Q3: Email Sending
Should the tool include the ability to email the PDF directly to a client?

A) Yes — include "Send via Email" using Resend (requires a free Resend API key)
B) No — download only; the user emails it themselves
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Q4: Invoice Types
What document types should the tool support?

A) Invoice only
B) Invoice + Quote/Estimate (user selects which type to create)
C) Invoice + Quote + Receipt (three document types)
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Q5: Branding / Customisation
What level of client branding should be supported?

A) Minimal — business name, logo upload, and one primary color
B) Standard — logo, primary color, font choice (3–4 options), and footer text
C) Full — logo, color scheme, font, custom watermark, and multiple templates
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Q6: Tax Handling
How should tax be handled on line items?

A) Single tax rate applied to the whole invoice total (e.g., 20% VAT)
B) Per-line-item tax rate (each line can have a different rate)
C) No tax field — totals only
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Q7: Currency
Which currencies should be supported?

A) Single currency (user types the symbol manually, e.g., $, £, €)
B) Dropdown of common currencies (USD, GBP, EUR, INR, AUD, CAD)
C) Full international currency list
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Q8: Deployment / Hosting
Where will this be deployed?

A) Vercel (free tier, recommended — zero config for Next.js)
B) Self-hosted on a VPS (e.g., DigitalOcean, Linode)
C) Not decided yet — just make it run locally for now
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Q9: Security Extension
Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)
B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)
X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Q10: Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints
B) Partial — enforce PBT rules only for pure functions and serialization round-trips
C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects)
X) Other (please describe after [Answer]: tag below)

[Answer]: C

---
