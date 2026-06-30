import {
  Document,
  Page,
  View,
  Text,
  Image,
  Link,
  StyleSheet,
} from "@react-pdf/renderer";
import type { InvoiceData } from "@/lib/types";
import { computeInvoice, fmt } from "@/lib/calculations";
import { getSymbol } from "@/lib/currencies";
import { getLabels } from "@/lib/languages";

const WATERMARK_COLORS: Record<string, string> = {
  PAID: "#16a34a",
  DRAFT: "#9ca3af",
  CONFIDENTIAL: "#dc2626",
};

export default function InvoiceDocument({ data }: { data: InvoiceData }) {
  const symbol = getSymbol(data.currency);
  const l = getLabels(data.language ?? "en");
  const comp = computeInvoice(data);
  const { subtotal, discount: discountAmt, tax, lateFee, total, deposit, paid, balance } = comp;
  const primary = data.branding.primaryColor;
  const font = data.branding.font;
  const template = data.branding?.template ?? "modern";
  const watermark = data.branding?.watermark ?? "none";
  const docLabel = data.documentType === "invoice" ? l.invoice : l.quote;
  const initial = data.business.name?.[0]?.toUpperCase() ?? "B";

  // ── MODERN template styles ────────────────────────────────────────────
  const modernStyles = StyleSheet.create({
    page: { padding: 48, fontFamily: font, fontSize: 10, color: "#374151", backgroundColor: "#ffffff" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
    logo: { width: 72, height: 72, objectFit: "contain" },
    logoBg: { width: 72, height: 72, backgroundColor: primary, borderRadius: 8, justifyContent: "center", alignItems: "center" },
    logoInitial: { color: "#fff", fontSize: 26, fontFamily: font },
    docTitle: { fontSize: 28, color: primary, fontFamily: font },
    docMeta: { marginTop: 3, color: "#6b7280", fontSize: 9 },
    divider: { borderBottom: `1.5px solid ${primary}`, marginBottom: 20 },
    row2col: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
    section: { flex: 1 },
    sLabel: { fontSize: 8, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 },
    sValue: { fontSize: 10, color: "#111827", lineHeight: 1.5 },
    tableHead: { flexDirection: "row", backgroundColor: primary, padding: "6 8", borderRadius: 2, marginBottom: 2 },
    tableHeadText: { color: "#fff", fontSize: 8 },
    tableRow: { flexDirection: "row", padding: "5 8", borderBottom: "1px solid #f3f4f6" },
    tableRowAlt: { backgroundColor: "#f9fafb" },
    colDesc: { flex: 3 },
    colQty: { flex: 1, textAlign: "right" },
    colRate: { flex: 1.3, textAlign: "right" },
    colAmt: { flex: 1.3, textAlign: "right" },
    totalsWrap: { alignItems: "flex-end", marginTop: 14 },
    totalRow: { flexDirection: "row", justifyContent: "space-between", width: 210, padding: "2 0" },
    totalLabel: { color: "#6b7280", fontSize: 9 },
    totalValue: { fontSize: 10 },
    grandRow: { flexDirection: "row", justifyContent: "space-between", width: 210, backgroundColor: primary, padding: "7 10", borderRadius: 4, marginTop: 5 },
    grandLabel: { color: "#fff", fontSize: 10 },
    grandValue: { color: "#fff", fontSize: 10 },
    notes: { marginTop: 22 },
    notesLabel: { fontSize: 8, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
    notesText: { fontSize: 9, color: "#374151", lineHeight: 1.6 },
    sigWrap: { marginTop: 24, flexDirection: "row", justifyContent: "space-between" },
    sigBox: { width: 200 },
    sigLine: { borderBottom: "1px solid #d1d5db", marginBottom: 4 },
    sigLabel: { fontSize: 8, color: "#9ca3af" },
    sigName: { fontSize: 9, color: "#374151", marginTop: 2 },
    footer: { position: "absolute", bottom: 24, left: 48, right: 48, borderTop: `1px solid ${primary}`, paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 8, color: "#9ca3af" },
  });

  // ── MINIMAL template styles ───────────────────────────────────────────
  const minimalStyles = StyleSheet.create({
    page: { padding: 52, fontFamily: font, fontSize: 10, color: "#1a1a1a", backgroundColor: "#ffffff" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 },
    logo: { width: 72, height: 72, objectFit: "contain" },
    logoBg: { width: 72, height: 72, border: "1.5px solid #1a1a1a", justifyContent: "center", alignItems: "center" },
    logoInitial: { color: "#1a1a1a", fontSize: 26, fontFamily: font },
    docTitle: { fontSize: 28, color: "#1a1a1a", fontFamily: font },
    docMeta: { marginTop: 3, color: "#6b7280", fontSize: 9 },
    divider: { borderBottom: "1.5px solid #1a1a1a", marginBottom: 20 },
    row2col: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
    section: { flex: 1 },
    sLabel: { fontSize: 8, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 },
    sValue: { fontSize: 10, color: "#1a1a1a", lineHeight: 1.5 },
    tableHead: { flexDirection: "row", borderBottom: "1.5px solid #1a1a1a", padding: "6 4", marginBottom: 2 },
    tableHeadText: { color: "#1a1a1a", fontSize: 8 },
    tableRow: { flexDirection: "row", padding: "5 4", borderBottom: "0.5px solid #e5e7eb" },
    tableRowAlt: { backgroundColor: "#fafafa" },
    colDesc: { flex: 3 },
    colQty: { flex: 1, textAlign: "right" },
    colRate: { flex: 1.3, textAlign: "right" },
    colAmt: { flex: 1.3, textAlign: "right" },
    totalsWrap: { alignItems: "flex-end", marginTop: 14 },
    totalRow: { flexDirection: "row", justifyContent: "space-between", width: 210, padding: "2 0" },
    totalLabel: { color: "#6b7280", fontSize: 9 },
    totalValue: { fontSize: 10 },
    grandRow: { flexDirection: "row", justifyContent: "space-between", width: 210, borderTop: "1.5px solid #1a1a1a", padding: "7 0", marginTop: 5 },
    grandLabel: { color: "#1a1a1a", fontSize: 11 },
    grandValue: { color: "#1a1a1a", fontSize: 11 },
    notes: { marginTop: 22 },
    notesLabel: { fontSize: 8, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
    notesText: { fontSize: 9, color: "#374151", lineHeight: 1.6 },
    sigWrap: { marginTop: 24, flexDirection: "row", justifyContent: "space-between" },
    sigBox: { width: 200 },
    sigLine: { borderBottom: "1px solid #1a1a1a", marginBottom: 4 },
    sigLabel: { fontSize: 8, color: "#6b7280" },
    sigName: { fontSize: 9, color: "#1a1a1a", marginTop: 2 },
    footer: { position: "absolute", bottom: 28, left: 52, right: 52, borderTop: "0.5px solid #d1d5db", paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 8, color: "#9ca3af" },
  });

  // ── CORPORATE template styles ─────────────────────────────────────────
  const corporateStyles = StyleSheet.create({
    page: { fontFamily: font, fontSize: 10, color: "#374151", backgroundColor: "#ffffff" },
    topBand: { backgroundColor: primary, padding: "32 48 24 48", marginBottom: 0 },
    topBandInner: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    logo: { width: 64, height: 64, objectFit: "contain" },
    logoBg: { width: 64, height: 64, backgroundColor: "#ffffff22", borderRadius: 6, justifyContent: "center", alignItems: "center" },
    logoInitial: { color: "#fff", fontSize: 22, fontFamily: font },
    docTitle: { fontSize: 30, color: "#ffffff", fontFamily: font },
    docMeta: { marginTop: 3, color: "#ffffffaa", fontSize: 9 },
    body: { padding: "20 48 48 48" },
    divider: { borderBottom: "1px solid #e5e7eb", marginBottom: 20 },
    row2col: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
    section: { flex: 1 },
    sLabel: { fontSize: 8, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 },
    sValue: { fontSize: 10, color: "#111827", lineHeight: 1.5 },
    tableHead: { flexDirection: "row", backgroundColor: "#f3f4f6", padding: "6 8", borderRadius: 2, marginBottom: 2 },
    tableHeadText: { color: "#374151", fontSize: 8 },
    tableRow: { flexDirection: "row", padding: "5 8", borderBottom: "1px solid #f3f4f6" },
    tableRowAlt: { backgroundColor: "#f9fafb" },
    colDesc: { flex: 3 },
    colQty: { flex: 1, textAlign: "right" },
    colRate: { flex: 1.3, textAlign: "right" },
    colAmt: { flex: 1.3, textAlign: "right" },
    totalsWrap: { alignItems: "flex-end", marginTop: 14 },
    totalRow: { flexDirection: "row", justifyContent: "space-between", width: 210, padding: "2 0" },
    totalLabel: { color: "#6b7280", fontSize: 9 },
    totalValue: { fontSize: 10 },
    grandRow: { flexDirection: "row", justifyContent: "space-between", width: 210, backgroundColor: primary, padding: "7 10", borderRadius: 4, marginTop: 5 },
    grandLabel: { color: "#fff", fontSize: 10 },
    grandValue: { color: "#fff", fontSize: 10 },
    notes: { marginTop: 22 },
    notesLabel: { fontSize: 8, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
    notesText: { fontSize: 9, color: "#374151", lineHeight: 1.6 },
    sigWrap: { marginTop: 24, flexDirection: "row", justifyContent: "space-between" },
    sigBox: { width: 200 },
    sigLine: { borderBottom: "1px solid #d1d5db", marginBottom: 4 },
    sigLabel: { fontSize: 8, color: "#9ca3af" },
    sigName: { fontSize: 9, color: "#374151", marginTop: 2 },
    footer: { position: "absolute", bottom: 24, left: 48, right: 48, borderTop: `1px solid ${primary}`, paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 8, color: "#9ca3af" },
  });

  const isCorporate = template === "corporate";
  // Type assertion: all three style objects share the same keys used by inner functions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = (template === "minimal" ? minimalStyles : template === "corporate" ? corporateStyles : modernStyles) as typeof modernStyles;

  function TableHeader() {
    return (
      <View style={s.tableHead}>
        <Text style={[s.tableHeadText, s.colDesc]}>{l.description}</Text>
        <Text style={[s.tableHeadText, s.colQty]}>{l.qty}</Text>
        <Text style={[s.tableHeadText, s.colRate]}>{l.rate}</Text>
        <Text style={[s.tableHeadText, s.colAmt]}>{l.amount}</Text>
      </View>
    );
  }

  function LineItemRows() {
    return (
      <>
        {data.lineItems.map((item, i) => (
          <View key={item.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
            <Text style={[{ fontSize: 10 }, s.colDesc]}>{item.description}</Text>
            <Text style={[{ fontSize: 10 }, s.colQty]}>{item.quantity}</Text>
            <Text style={[{ fontSize: 10 }, s.colRate]}>{fmt(item.rate, symbol)}</Text>
            <Text style={[{ fontSize: 10 }, s.colAmt]}>{fmt(item.quantity * item.rate, symbol)}</Text>
          </View>
        ))}
      </>
    );
  }

  function Totals() {
    return (
      <View style={s.totalsWrap} wrap={false}>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>{l.subtotal}</Text>
          <Text style={s.totalValue}>{fmt(subtotal, symbol)}</Text>
        </View>
        {discountAmt > 0 && (
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>
              {l.discount}{" "}
              {(data.discount?.type === "percentage" && data.discount.value)
                ? `(${data.discount.value}%)`
                : ""}
            </Text>
            <Text style={s.totalValue}>-{fmt(discountAmt, symbol)}</Text>
          </View>
        )}
        {data.taxRate > 0 && (
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>{l.tax} ({data.taxRate}%)</Text>
            <Text style={s.totalValue}>{fmt(tax, symbol)}</Text>
          </View>
        )}
        {lateFee > 0 && (
          <View style={s.totalRow}>
            <Text style={[s.totalLabel, { color: "#dc2626" }]}>{l.lateFee}</Text>
            <Text style={[s.totalValue, { color: "#dc2626" }]}>{fmt(lateFee, symbol)}</Text>
          </View>
        )}
        <View style={s.grandRow}>
          <Text style={s.grandLabel}>
            {data.documentType === "invoice" ? l.totalDue : l.total}
          </Text>
          <Text style={s.grandValue}>{fmt(total, symbol)}</Text>
        </View>
        {deposit > 0 && (
          <View style={s.totalRow}>
            <Text style={[s.totalLabel, { color: primary }]}>{l.deposit}</Text>
            <Text style={[s.totalValue, { color: primary }]}>{fmt(deposit, symbol)}</Text>
          </View>
        )}
        {paid > 0 && (
          <>
            <View style={s.totalRow}>
              <Text style={[s.totalLabel, { color: "#16a34a" }]}>{l.paid}</Text>
              <Text style={[s.totalValue, { color: "#16a34a" }]}>-{fmt(paid, symbol)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={[s.totalLabel, { fontFamily: font }]}>{l.balanceDue}</Text>
              <Text style={[s.totalValue, { fontFamily: font, color: balance > 0 ? "#d97706" : "#16a34a" }]}>
                {fmt(balance, symbol)}
              </Text>
            </View>
          </>
        )}
      </View>
    );
  }

  function PaymentLinkBlock() {
    if (!data.paymentLink) return null;
    return (
      <View style={{ marginTop: 16, alignItems: "flex-end" }} wrap={false}>
        <Link
          src={data.paymentLink}
          style={{
            backgroundColor: primary,
            color: "#ffffff",
            fontSize: 10,
            fontFamily: font,
            padding: "8 16",
            borderRadius: 4,
            textDecoration: "none",
          }}
        >
          {l.payNow} →
        </Link>
        <Text style={{ fontSize: 7, color: "#9ca3af", marginTop: 3 }}>{data.paymentLink}</Text>
      </View>
    );
  }

  function TermsBlock() {
    if (!data.terms) return null;
    return (
      <View style={s.notes} wrap={false}>
        <Text style={s.notesLabel}>{l.terms}</Text>
        <Text style={[s.notesText, { fontSize: 8, color: "#6b7280" }]}>{data.terms}</Text>
      </View>
    );
  }

  function SignatureBlock() {
    if (!data.signature && !data.signatureImage) return null;
    return (
      <View style={s.sigWrap}>
        <View style={s.sigBox}>
          {data.signatureImage ? (
            <Image src={data.signatureImage} style={{ height: 34, objectFit: "contain", marginBottom: 2, alignSelf: "flex-start" }} />
          ) : null}
          <View style={s.sigLine} />
          <Text style={s.sigLabel}>{l.authorisedBy}</Text>
          {data.signature ? <Text style={s.sigName}>{data.signature}</Text> : null}
        </View>
        {data.qrData && (
          <Image src={data.qrData} style={{ width: 60, height: 60 }} />
        )}
      </View>
    );
  }

  function NotesBlock() {
    if (!data.notes) return null;
    return (
      <View style={s.notes}>
        <Text style={s.notesLabel}>{l.notes}</Text>
        <Text style={s.notesText}>{data.notes}</Text>
      </View>
    );
  }

  function Watermark() {
    if (!watermark || watermark === "none") return null;
    const color = WATERMARK_COLORS[watermark] ?? "#9ca3af";
    return (
      <Text
        style={{
          position: "absolute",
          top: "38%",
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 72,
          color,
          opacity: 0.12,
          fontFamily: font,
          transform: "rotate(-35deg)",
        }}
        fixed
      >
        {watermark}
      </Text>
    );
  }

  if (isCorporate) {
    const cs = corporateStyles;
    return (
      <Document>
        <Page size="A4" style={cs.page}>
          <Watermark />
          {/* Colored top band */}
          <View style={cs.topBand}>
            <View style={cs.topBandInner}>
              <View>
                {data.business.logo ? (
                  <Image src={data.business.logo} style={cs.logo} />
                ) : (
                  <View style={cs.logoBg}>
                    <Text style={cs.logoInitial}>{initial}</Text>
                  </View>
                )}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={cs.docTitle}>{docLabel}</Text>
                <Text style={cs.docMeta}>#{data.invoiceNumber}</Text>
                {data.poNumber ? <Text style={cs.docMeta}>{l.poNumber}: {data.poNumber}</Text> : null}
                <Text style={cs.docMeta}>{l.issueDate}: {data.issueDate}</Text>
                {data.documentType === "invoice" && (
                  <Text style={cs.docMeta}>{l.dueDate}: {data.dueDate}</Text>
                )}
              </View>
            </View>
          </View>

          <View style={cs.body}>
            {/* From / To */}
            <View style={[cs.row2col, { marginTop: 20 }]}>
              <View style={cs.section}>
                <Text style={cs.sLabel}>{l.from}</Text>
                <Text style={[cs.sValue, { fontFamily: font }]}>{data.business.name}</Text>
                <Text style={cs.sValue}>{data.business.address}</Text>
                <Text style={cs.sValue}>{data.business.email}</Text>
                <Text style={cs.sValue}>{data.business.phone}</Text>
              </View>
              <View style={[cs.section, { alignItems: "flex-end" }]}>
                <Text style={cs.sLabel}>{l.billTo}</Text>
                <Text style={[cs.sValue, { fontFamily: font, textAlign: "right" }]}>{data.client.name}</Text>
                <Text style={[cs.sValue, { textAlign: "right" }]}>{data.client.address}</Text>
                <Text style={[cs.sValue, { textAlign: "right" }]}>{data.client.email}</Text>
              </View>
            </View>

            <TableHeader />
            <LineItemRows />
            <Totals />
            <PaymentLinkBlock />
            <NotesBlock />
            <TermsBlock />
            <SignatureBlock />
          </View>

          <View style={cs.footer} fixed>
            <Text style={cs.footerText}>{data.business.name}</Text>
            <Text style={cs.footerText}>{data.branding.footerText || "Thank you for your business!"}</Text>
            <Text style={cs.footerText}>{docLabel} #{data.invoiceNumber}</Text>
          </View>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Watermark />

        {/* Header */}
        <View style={s.header}>
          <View>
            {data.business.logo ? (
              <Image src={data.business.logo} style={s.logo} />
            ) : (
              <View style={s.logoBg}>
                <Text style={s.logoInitial}>{initial}</Text>
              </View>
            )}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.docTitle}>{docLabel}</Text>
            <Text style={s.docMeta}>#{data.invoiceNumber}</Text>
            {data.poNumber ? <Text style={s.docMeta}>{l.poNumber}: {data.poNumber}</Text> : null}
            <Text style={s.docMeta}>{l.issueDate}: {data.issueDate}</Text>
            {data.documentType === "invoice" && (
              <Text style={s.docMeta}>{l.dueDate}: {data.dueDate}</Text>
            )}
          </View>
        </View>

        <View style={s.divider} />

        {/* From / To */}
        <View style={s.row2col}>
          <View style={s.section}>
            <Text style={s.sLabel}>{l.from}</Text>
            <Text style={[s.sValue, { fontFamily: font }]}>{data.business.name}</Text>
            <Text style={s.sValue}>{data.business.address}</Text>
            <Text style={s.sValue}>{data.business.email}</Text>
            <Text style={s.sValue}>{data.business.phone}</Text>
          </View>
          <View style={[s.section, { alignItems: "flex-end" }]}>
            <Text style={s.sLabel}>{l.billTo}</Text>
            <Text style={[s.sValue, { fontFamily: font, textAlign: "right" }]}>{data.client.name}</Text>
            <Text style={[s.sValue, { textAlign: "right" }]}>{data.client.address}</Text>
            <Text style={[s.sValue, { textAlign: "right" }]}>{data.client.email}</Text>
          </View>
        </View>

        <TableHeader />
        <LineItemRows />
        <Totals />
        <PaymentLinkBlock />
        <NotesBlock />
        <TermsBlock />
        <SignatureBlock />

        <View style={s.footer} fixed>
          <Text style={s.footerText}>{data.business.name}</Text>
          <Text style={s.footerText}>{data.branding.footerText || "Thank you for your business!"}</Text>
          <Text style={s.footerText}>{docLabel} #{data.invoiceNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
