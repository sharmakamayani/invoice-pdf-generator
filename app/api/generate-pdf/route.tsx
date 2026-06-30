import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import InvoiceDocument from "@/pdf/InvoiceDocument";
import type { InvoiceData } from "@/lib/types";
import { getSymbol } from "@/lib/currencies";
import { computeInvoice } from "@/lib/calculations";

export async function POST(request: Request) {
  const data: InvoiceData = await request.json();

  const symbol = getSymbol(data.currency);
  const c = computeInvoice(data);

  const qrText = [
    `${data.documentType.toUpperCase()} #${data.invoiceNumber}`,
    `To: ${data.client.name}`,
    `Total: ${symbol}${c.total.toFixed(2)}`,
    c.balance !== c.total ? `Balance: ${symbol}${c.balance.toFixed(2)}` : "",
    data.paymentLink ? `Pay: ${data.paymentLink}` : "",
    data.issueDate ? `Date: ${data.issueDate}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const qrData = await QRCode.toDataURL(qrText, { width: 120, margin: 1 });

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(<InvoiceDocument data={{ ...data, qrData }} />);
  } catch (err) {
    // A logo react-pdf can't decode would otherwise fail the whole invoice —
    // retry once without it so the document still generates.
    if (data.business.logo) {
      buffer = await renderToBuffer(
        <InvoiceDocument data={{ ...data, qrData, business: { ...data.business, logo: undefined } }} />
      );
    } else {
      throw err;
    }
  }

  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "application/pdf" },
  });
}
