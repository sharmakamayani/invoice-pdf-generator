import { renderToBuffer } from "@react-pdf/renderer";
import InvoiceDocument from "@/pdf/InvoiceDocument";
import type { InvoiceData } from "@/lib/types";

export async function POST(request: Request) {
  const data: InvoiceData = await request.json();
  const buffer = await renderToBuffer(<InvoiceDocument data={data} />);
  return new Response(buffer, {
    headers: { "Content-Type": "application/pdf" },
  });
}
