import { renderToBuffer } from "@react-pdf/renderer";
import ReceiptDocument from "@/pdf/ReceiptDocument";
import type { InvoiceData } from "@/lib/types";

export async function POST(request: Request) {
  const data: InvoiceData = await request.json();
  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(<ReceiptDocument data={data} />);
  } catch (err) {
    if (data.business.logo) {
      buffer = await renderToBuffer(
        <ReceiptDocument data={{ ...data, business: { ...data.business, logo: undefined } }} />
      );
    } else {
      throw err;
    }
  }
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "application/pdf" },
  });
}
