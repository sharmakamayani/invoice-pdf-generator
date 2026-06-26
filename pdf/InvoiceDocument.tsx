import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { InvoiceData } from "@/lib/types";
import { calcSubtotal, calcTax, calcTotal, fmt } from "@/lib/calculations";
import { getSymbol } from "@/lib/currencies";

export default function InvoiceDocument({ data }: { data: InvoiceData }) {
  const symbol = getSymbol(data.currency);
  const subtotal = calcSubtotal(data.lineItems);
  const tax = calcTax(subtotal, data.taxRate);
  const total = calcTotal(subtotal, tax);
  const primary = data.branding.primaryColor;
  const font = data.branding.font;
  const label = data.documentType === "invoice" ? "INVOICE" : "QUOTE";

  const s = StyleSheet.create({
    page: {
      padding: 48,
      fontFamily: font,
      fontSize: 10,
      color: "#374151",
      backgroundColor: "#ffffff",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 32,
    },
    logo: { width: 80, height: 80, objectFit: "contain" },
    logoPlaceholder: {
      width: 80,
      height: 80,
      backgroundColor: primary,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    logoInitial: { color: "#fff", fontSize: 28, fontFamily: font },
    docTitle: { fontSize: 28, fontFamily: font, color: primary, fontWeight: "bold" },
    docMeta: { marginTop: 4, color: "#6b7280", fontSize: 9 },
    row2col: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    section: { flex: 1 },
    sectionLabel: {
      fontSize: 8,
      fontFamily: font,
      color: "#9ca3af",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 4,
    },
    sectionValue: { fontSize: 10, color: "#111827", lineHeight: 1.5 },
    divider: { borderBottom: `1px solid ${primary}`, marginBottom: 16 },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: primary,
      padding: "6 8",
      borderRadius: 2,
      marginBottom: 2,
    },
    tableHeaderText: { color: "#ffffff", fontSize: 8, fontFamily: font },
    tableRow: {
      flexDirection: "row",
      padding: "5 8",
      borderBottom: "1px solid #f3f4f6",
    },
    tableRowAlt: { backgroundColor: "#f9fafb" },
    colDesc: { flex: 3 },
    colQty: { flex: 1, textAlign: "right" },
    colRate: { flex: 1.2, textAlign: "right" },
    colAmt: { flex: 1.2, textAlign: "right" },
    totalsContainer: { alignItems: "flex-end", marginTop: 12 },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: 200,
      padding: "3 0",
    },
    totalLabel: { color: "#6b7280", fontSize: 9 },
    totalValue: { fontSize: 10 },
    grandTotalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: 200,
      backgroundColor: primary,
      padding: "6 8",
      borderRadius: 4,
      marginTop: 4,
    },
    grandLabel: { color: "#ffffff", fontSize: 10, fontFamily: font },
    grandValue: { color: "#ffffff", fontSize: 10, fontFamily: font },
    notes: { marginTop: 24 },
    notesLabel: {
      fontSize: 8,
      color: "#9ca3af",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 4,
    },
    notesText: { fontSize: 9, color: "#374151", lineHeight: 1.6 },
    footer: {
      position: "absolute",
      bottom: 24,
      left: 48,
      right: 48,
      borderTop: `1px solid ${primary}`,
      paddingTop: 8,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    footerText: { fontSize: 8, color: "#9ca3af" },
  });

  const initial = data.business.name?.[0]?.toUpperCase() ?? "B";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            {data.business.logo ? (
              <Image src={data.business.logo} style={s.logo} />
            ) : (
              <View style={s.logoPlaceholder}>
                <Text style={s.logoInitial}>{initial}</Text>
              </View>
            )}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.docTitle}>{label}</Text>
            <Text style={s.docMeta}>#{data.invoiceNumber}</Text>
            <Text style={s.docMeta}>Issue: {data.issueDate}</Text>
            {data.documentType === "invoice" && (
              <Text style={s.docMeta}>Due: {data.dueDate}</Text>
            )}
          </View>
        </View>

        <View style={s.divider} />

        {/* From / To */}
        <View style={s.row2col}>
          <View style={s.section}>
            <Text style={s.sectionLabel}>From</Text>
            <Text style={[s.sectionValue, { fontFamily: font }]}>
              {data.business.name}
            </Text>
            <Text style={s.sectionValue}>{data.business.address}</Text>
            <Text style={s.sectionValue}>{data.business.email}</Text>
            <Text style={s.sectionValue}>{data.business.phone}</Text>
          </View>
          <View style={[s.section, { alignItems: "flex-end" }]}>
            <Text style={s.sectionLabel}>Bill To</Text>
            <Text style={[s.sectionValue, { fontFamily: font, textAlign: "right" }]}>
              {data.client.name}
            </Text>
            <Text style={[s.sectionValue, { textAlign: "right" }]}>
              {data.client.address}
            </Text>
            <Text style={[s.sectionValue, { textAlign: "right" }]}>
              {data.client.email}
            </Text>
          </View>
        </View>

        {/* Line items table */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colDesc]}>Description</Text>
          <Text style={[s.tableHeaderText, s.colQty]}>Qty</Text>
          <Text style={[s.tableHeaderText, s.colRate]}>Rate</Text>
          <Text style={[s.tableHeaderText, s.colAmt]}>Amount</Text>
        </View>

        {data.lineItems.map((item, i) => (
          <View key={item.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={[{ fontSize: 10 }, s.colDesc]}>{item.description}</Text>
            <Text style={[{ fontSize: 10 }, s.colQty]}>{item.quantity}</Text>
            <Text style={[{ fontSize: 10 }, s.colRate]}>{fmt(item.rate, symbol)}</Text>
            <Text style={[{ fontSize: 10 }, s.colAmt]}>
              {fmt(item.quantity * item.rate, symbol)}
            </Text>
          </View>
        ))}

        {/* Totals */}
        <View style={s.totalsContainer}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValue}>{fmt(subtotal, symbol)}</Text>
          </View>
          {data.taxRate > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Tax ({data.taxRate}%)</Text>
              <Text style={s.totalValue}>{fmt(tax, symbol)}</Text>
            </View>
          )}
          <View style={s.grandTotalRow}>
            <Text style={s.grandLabel}>
              {data.documentType === "invoice" ? "Total Due" : "Total"}
            </Text>
            <Text style={s.grandValue}>{fmt(total, symbol)}</Text>
          </View>
        </View>

        {/* Notes */}
        {data.notes ? (
          <View style={s.notes}>
            <Text style={s.notesLabel}>Notes / Payment Terms</Text>
            <Text style={s.notesText}>{data.notes}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{data.business.name}</Text>
          <Text style={s.footerText}>
            {data.branding.footerText || "Thank you for your business!"}
          </Text>
          <Text style={s.footerText}>
            {label} #{data.invoiceNumber}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
