import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";

const OUT = "C:/ai-dev/Kamayani Apps/sample-invoices";
mkdirSync(OUT, { recursive: true });

function invoiceHTML(d) {
  const rows = d.items.map(
    (i) => `<tr><td>${i.desc}</td><td class="r">${i.qty}</td><td class="r">${d.sym}${i.rate.toFixed(2)}</td><td class="r">${d.sym}${(i.qty * i.rate).toFixed(2)}</td></tr>`
  ).join("");
  const sub = d.items.reduce((s, i) => s + i.qty * i.rate, 0);
  const tax = sub * (d.taxRate / 100);
  const total = sub + tax;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:44px;color:#1a1a1a;background:#fff;width:720px}
    .head{display:flex;justify-content:space-between;border-bottom:3px solid ${d.color};padding-bottom:16px;margin-bottom:24px}
    .biz{font-size:22px;font-weight:bold;color:${d.color}}
    .muted{color:#555;font-size:13px;line-height:1.6}
    .title{font-size:30px;font-weight:bold;color:${d.color};text-align:right}
    h4{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 4px}
    table{width:100%;border-collapse:collapse;margin:20px 0;font-size:14px}
    th{background:${d.color};color:#fff;text-align:left;padding:9px}
    td{padding:9px;border-bottom:1px solid #eee}
    .r{text-align:right}
    .totals{width:270px;margin-left:auto;font-size:14px}
    .totals .row{display:flex;justify-content:space-between;padding:4px 2px}
    .grand{display:flex;justify-content:space-between;background:${d.color};color:#fff;padding:9px 12px;font-weight:bold;border-radius:4px;margin-top:6px}
  </style></head><body>
    <div class="head">
      <div><div class="biz">${d.biz}</div><div class="muted">${d.bizAddr}<br>${d.bizEmail} &middot; ${d.bizPhone}</div></div>
      <div><div class="title">INVOICE</div><div class="muted">No: ${d.number}<br>Issue Date: ${d.issue}<br>Due Date: ${d.due}</div></div>
    </div>
    <h4>Bill To</h4>
    <div class="muted" style="margin-bottom:16px"><b>${d.client}</b><br>${d.clientAddr}<br>${d.clientEmail}</div>
    <table><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${d.sym}${sub.toFixed(2)}</span></div>
      <div class="row"><span>Tax (${d.taxRate}%)</span><span>${d.sym}${tax.toFixed(2)}</span></div>
      <div class="grand"><span>Total Due</span><span>${d.sym}${total.toFixed(2)}</span></div>
    </div>
    <p class="muted" style="margin-top:28px">${d.notes}</p>
  </body></html>`;
}

function receiptHTML(d) {
  const rows = d.items.map((i) => `<tr><td>${i.name}</td><td class="r">${d.sym}${i.amt.toFixed(2)}</td></tr>`).join("");
  const sub = d.items.reduce((s, i) => s + i.amt, 0);
  const tax = sub * (d.taxRate / 100);
  const total = sub + tax;
  // Clean, high-contrast, well-spaced layout — easy for free Tesseract OCR.
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:44px;background:#fff;color:#111;width:480px}
    h1{font-size:28px;font-weight:bold;margin:0 0 6px}
    .sub{font-size:16px;color:#333;line-height:1.6;margin-bottom:22px}
    .rlabel{font-size:13px;letter-spacing:1px;color:#888;text-transform:uppercase;margin-bottom:2px}
    table{width:100%;border-collapse:collapse;margin:10px 0;font-size:18px}
    td{padding:12px 4px;border-bottom:1px solid #e5e5e5}
    .r{text-align:right}
    .line{display:flex;justify-content:space-between;font-size:18px;padding:8px 4px}
    .total{display:flex;justify-content:space-between;font-size:22px;font-weight:bold;border-top:3px solid #111;padding:14px 4px 0;margin-top:8px}
  </style></head><body>
    <h1>${d.vendor}</h1>
    <div class="sub">${d.addr}</div>
    <div class="rlabel">Receipt No</div><div style="font-size:18px;margin-bottom:10px">${d.number}</div>
    <div class="rlabel">Date</div><div style="font-size:18px">${d.date}</div>
    <table><tbody>${rows}</tbody></table>
    <div class="line"><span>Subtotal</span><span>${d.sym}${sub.toFixed(2)}</span></div>
    <div class="line"><span>Tax (${d.taxRate}%)</span><span>${d.sym}${tax.toFixed(2)}</span></div>
    <div class="total"><span>Total Paid</span><span>${d.sym}${total.toFixed(2)}</span></div>
  </body></html>`;
}

const invoices = [
  {
    file: "img-1-brightwave-GBP.png",
    html: invoiceHTML({
      color: "#0d9488", sym: "£", taxRate: 20, number: "INV-2042",
      biz: "Brightwave Studio", bizAddr: "12 Harbour Rd, Bristol, BS1 5TX", bizEmail: "hello@brightwave.io", bizPhone: "+44 117 555 0100",
      client: "Northwind Ltd", clientAddr: "55 King St, London EC2V 8AU", clientEmail: "ap@northwind.co.uk",
      issue: "2026-05-15", due: "2026-06-14",
      items: [{ desc: "Brand identity design", qty: 1, rate: 2400 }, { desc: "Logo revisions", qty: 3, rate: 150 }, { desc: "Business cards (500)", qty: 1, rate: 180 }],
      notes: "Payment due within 30 days by bank transfer.",
    }),
  },
  {
    file: "img-2-northwind-USD.png",
    html: invoiceHTML({
      color: "#4F46E5", sym: "$", taxRate: 8.25, number: "INV-100",
      biz: "Northwind Consulting LLC", bizAddr: "500 Market St, San Francisco, CA 94105", bizEmail: "billing@northwind.co", bizPhone: "+1 415 555 0142",
      client: "Globex Corporation", clientAddr: "1 Globex Plaza, Austin, TX 78701", clientEmail: "purchasing@globex.com",
      issue: "2026-06-03", due: "2026-06-18",
      items: [{ desc: "Strategy workshop", qty: 1, rate: 5000 }, { desc: "Implementation support", qty: 1, rate: 3250 }],
      notes: "Thank you for your business!",
    }),
  },
];

const receipts = [
  {
    file: "img-3-receipt-adobe.png",
    html: receiptHTML({
      vendor: "Adobe Inc", addr: "345 Park Avenue, San Jose, CA", number: "R-88213", date: "2026-06-08", sym: "$", taxRate: 9,
      items: [{ name: "Creative Cloud subscription", amt: 52.99 }, { name: "Stock image credits", amt: 30.00 }],
    }),
  },
  {
    file: "img-4-receipt-officedepot.png",
    html: receiptHTML({
      vendor: "Office Depot", addr: "88 Commerce Way, Denver, CO", number: "OD-40917", date: "2026-06-05", sym: "$", taxRate: 8,
      items: [{ name: "Printer paper (5 reams)", amt: 24.50 }, { name: "Ink cartridge", amt: 38.00 }, { name: "USB drive 64GB", amt: 12.00 }],
    }),
  },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const item of [...invoices, ...receipts]) {
  await page.setViewportSize({ width: 820, height: 1200 });
  await page.setContent(item.html, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/${item.file}`, fullPage: true });
  console.log("saved", item.file);
}
await browser.close();
console.log("done ->", OUT);
