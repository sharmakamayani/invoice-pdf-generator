import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { InvoiceData } from "@/lib/types";
import { computeInvoice, fmt } from "@/lib/calculations";
import { getSymbol } from "@/lib/currencies";

// Payment receipt — generated when an invoice is fully paid.
export default function ReceiptDocument({ data }: { data: InvoiceData }) {
  const symbol = getSymbol(data.currency);
  const c = computeInvoice(data);
  const primary = data.branding.primaryColor;
  const font = data.branding.font;
  const initial = data.business.name?.[0]?.toUpperCase() ?? "B";
  const lastPayment = data.payments?.[data.payments.length - 1];
  const paidDate = lastPayment?.date || new Date().toISOString().split("T")[0];

  const s = StyleSheet.create({
    page: { padding: 48, fontFamily: font, fontSize: 10, color: "#374151" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
    logo: { width: 64, height: 64, objectFit: "contain" },
    logoBg: { width: 64, height: 64, backgroundColor: primary, borderRadius: 8, justifyContent: "center", alignItems: "center" },
    logoInitial: { color: "#fff", fontSize: 24, fontFamily: font },
    title: { fontSize: 28, color: primary, fontFamily: font },
    meta: { marginTop: 3, color: "#6b7280", fontSize: 9 },
    stamp: { marginTop: 8, alignSelf: "flex-end", border: "2px solid #16a34a", color: "#16a34a", fontSize: 14, fontFamily: font, padding: "3 10", borderRadius: 4, transform: "rotate(-6deg)" },
    divider: { borderBottom: `1.5px solid ${primary}`, marginVertical: 18 },
    row2col: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
    sLabel: { fontSize: 8, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 },
    sValue: { fontSize: 10, color: "#111827", lineHeight: 1.5 },
    box: { backgroundColor: "#f9fafb", borderRadius: 8, padding: 16, marginTop: 8 },
    line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
    label: { color: "#6b7280", fontSize: 10 },
    value: { fontSize: 10 },
    grand: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#16a34a", padding: "8 12", borderRadius: 4, marginTop: 8 },
    grandText: { color: "#fff", fontSize: 11, fontFamily: font },
    footer: { position: "absolute", bottom: 24, left: 48, right: 48, borderTop: `1px solid ${primary}`, paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 8, color: "#9ca3af" },
  });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            {data.business.logo ? <Image src={data.business.logo} style={s.logo} /> : <View style={s.logoBg}><Text style={s.logoInitial}>{initial}</Text></View>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.title}>RECEIPT</Text>
            <Text style={s.meta}>For invoice #{data.invoiceNumber}</Text>
            <Text style={s.meta}>Paid: {paidDate}</Text>
            <Text style={s.stamp}>PAID</Text>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.row2col}>
          <View style={{ flex: 1 }}>
            <Text style={s.sLabel}>From</Text>
            <Text style={[s.sValue, { fontFamily: font }]}>{data.business.name}</Text>
            <Text style={s.sValue}>{data.business.address}</Text>
            <Text style={s.sValue}>{data.business.email}</Text>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={s.sLabel}>Received From</Text>
            <Text style={[s.sValue, { fontFamily: font, textAlign: "right" }]}>{data.client.name}</Text>
            <Text style={[s.sValue, { textAlign: "right" }]}>{data.client.email}</Text>
          </View>
        </View>

        <View style={s.box}>
          <View style={s.line}><Text style={s.label}>Invoice total</Text><Text style={s.value}>{fmt(c.total, symbol)}</Text></View>
          <View style={s.line}><Text style={s.label}>Amount paid</Text><Text style={s.value}>{fmt(c.paid, symbol)}</Text></View>
          {lastPayment && <View style={s.line}><Text style={s.label}>Payment method</Text><Text style={[s.value, { textTransform: "capitalize" }]}>{lastPayment.method}</Text></View>}
          <View style={s.grand}>
            <Text style={s.grandText}>Balance Due</Text>
            <Text style={s.grandText}>{fmt(c.balance, symbol)}</Text>
          </View>
        </View>

        {data.notes ? (
          <View style={{ marginTop: 22 }}>
            <Text style={s.sLabel}>Notes</Text>
            <Text style={[s.sValue, { fontSize: 9, color: "#6b7280" }]}>{data.notes}</Text>
          </View>
        ) : null}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>{data.business.name}</Text>
          <Text style={s.footerText}>Thank you for your payment!</Text>
          <Text style={s.footerText}>Receipt · #{data.invoiceNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
