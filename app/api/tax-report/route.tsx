import { renderToBuffer } from "@react-pdf/renderer";
import TaxReportDocument from "@/pdf/TaxReportDocument";

export async function POST(request: Request) {
  const { rows, totals, symbol, currency } = await request.json();
  const buffer = await renderToBuffer(
    <TaxReportDocument rows={rows} totals={totals} symbol={symbol} currency={currency} />
  );
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "application/pdf" },
  });
}
