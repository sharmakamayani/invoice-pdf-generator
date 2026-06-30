import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

interface TaxRow {
  number: string;
  date: string;
  client: string;
  net: number;
  tax: number;
  total: number;
}

interface Props {
  rows: TaxRow[];
  totals: { net: number; tax: number; total: number };
  symbol: string;
  currency: string;
}

const s = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", fontSize: 10, color: "#374151" },
  title: { fontSize: 22, color: "#4F46E5", marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#6b7280", marginBottom: 24 },
  tableHead: { flexDirection: "row", backgroundColor: "#4F46E5", padding: "6 8", marginBottom: 2 },
  th: { color: "#fff", fontSize: 8 },
  row: { flexDirection: "row", padding: "5 8", borderBottom: "1px solid #f3f4f6" },
  rowAlt: { backgroundColor: "#f9fafb" },
  cNum: { flex: 1.5 },
  cDate: { flex: 1.3 },
  cClient: { flex: 2 },
  cNet: { flex: 1.3, textAlign: "right" },
  cTax: { flex: 1.3, textAlign: "right" },
  cTotal: { flex: 1.4, textAlign: "right" },
  totalsRow: { flexDirection: "row", padding: "8 8", backgroundColor: "#eef2ff", marginTop: 2 },
  tLabel: { fontSize: 9 },
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, borderTop: "1px solid #4F46E5", paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: "#9ca3af" },
});

export default function TaxReportDocument({ rows, totals, symbol, currency }: Props) {
  const fmt = (n: number) => `${symbol}${n.toFixed(2)}`;
  const generated = new Date().toLocaleDateString();
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>Tax Summary Report</Text>
        <Text style={s.subtitle}>Currency: {currency} · Generated {generated} · {rows.length} invoices</Text>

        <View style={s.tableHead}>
          <Text style={[s.th, s.cNum]}>Invoice #</Text>
          <Text style={[s.th, s.cDate]}>Date</Text>
          <Text style={[s.th, s.cClient]}>Client</Text>
          <Text style={[s.th, s.cNet]}>Net</Text>
          <Text style={[s.th, s.cTax]}>Tax</Text>
          <Text style={[s.th, s.cTotal]}>Total</Text>
        </View>

        {rows.map((r, i) => (
          <View key={i} style={[s.row, i % 2 === 1 ? s.rowAlt : {}]}>
            <Text style={s.cNum}>{r.number}</Text>
            <Text style={s.cDate}>{r.date}</Text>
            <Text style={s.cClient}>{r.client}</Text>
            <Text style={s.cNet}>{fmt(r.net)}</Text>
            <Text style={s.cTax}>{fmt(r.tax)}</Text>
            <Text style={s.cTotal}>{fmt(r.total)}</Text>
          </View>
        ))}

        <View style={s.totalsRow}>
          <Text style={[s.tLabel, s.cNum, { fontFamily: "Helvetica-Bold" }]}>TOTAL</Text>
          <Text style={s.cDate}> </Text>
          <Text style={s.cClient}> </Text>
          <Text style={[s.tLabel, s.cNet]}>{fmt(totals.net)}</Text>
          <Text style={[s.tLabel, s.cTax, { color: "#4F46E5" }]}>{fmt(totals.tax)}</Text>
          <Text style={[s.tLabel, s.cTotal]}>{fmt(totals.total)}</Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Tax Summary Report</Text>
          <Text style={s.footerText}>Total tax collected: {fmt(totals.tax)}</Text>
        </View>
      </Page>
    </Document>
  );
}
