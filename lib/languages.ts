import type { Language } from "./types";

export interface Labels {
  invoice: string;
  quote: string;
  from: string;
  billTo: string;
  description: string;
  qty: string;
  rate: string;
  amount: string;
  subtotal: string;
  discount: string;
  tax: string;
  totalDue: string;
  total: string;
  notes: string;
  issueDate: string;
  dueDate: string;
  validUntil: string;
  signature: string;
  authorisedBy: string;
  poNumber: string;
  deposit: string;
  lateFee: string;
  paid: string;
  balanceDue: string;
  terms: string;
  payNow: string;
  paymentTerms: string;
}

export const labels: Record<Language, Labels> = {
  en: {
    invoice: "INVOICE", quote: "QUOTE",
    from: "From", billTo: "Bill To",
    description: "Description", qty: "Qty", rate: "Rate", amount: "Amount",
    subtotal: "Subtotal", discount: "Discount", tax: "Tax", totalDue: "Total Due", total: "Total",
    notes: "Notes / Payment Terms",
    issueDate: "Issue Date", dueDate: "Due Date", validUntil: "Valid Until",
    signature: "Signature", authorisedBy: "Authorised By",
    poNumber: "PO Number", deposit: "Deposit Due", lateFee: "Late Fee",
    paid: "Paid", balanceDue: "Balance Due", terms: "Terms & Conditions",
    payNow: "Pay Now", paymentTerms: "Payment Terms",
  },
  es: {
    invoice: "FACTURA", quote: "PRESUPUESTO",
    from: "De", billTo: "Facturar A",
    description: "Descripción", qty: "Cant", rate: "Precio", amount: "Total",
    subtotal: "Subtotal", discount: "Descuento", tax: "Impuesto", totalDue: "Total a Pagar", total: "Total",
    notes: "Notas / Condiciones de Pago",
    issueDate: "Fecha de Emisión", dueDate: "Fecha de Vencimiento", validUntil: "Válido Hasta",
    signature: "Firma", authorisedBy: "Autorizado Por",
    poNumber: "Nº de Pedido", deposit: "Depósito", lateFee: "Recargo por Mora",
    paid: "Pagado", balanceDue: "Saldo Pendiente", terms: "Términos y Condiciones",
    payNow: "Pagar Ahora", paymentTerms: "Condiciones de Pago",
  },
  fr: {
    invoice: "FACTURE", quote: "DEVIS",
    from: "De", billTo: "Facturer À",
    description: "Description", qty: "Qté", rate: "Prix", amount: "Montant",
    subtotal: "Sous-total", discount: "Remise", tax: "Taxe", totalDue: "Total Dû", total: "Total",
    notes: "Notes / Conditions de Paiement",
    issueDate: "Date d'Émission", dueDate: "Date d'Échéance", validUntil: "Valable Jusqu'au",
    signature: "Signature", authorisedBy: "Autorisé Par",
    poNumber: "N° de Commande", deposit: "Acompte", lateFee: "Pénalité de Retard",
    paid: "Payé", balanceDue: "Solde Dû", terms: "Conditions Générales",
    payNow: "Payer Maintenant", paymentTerms: "Conditions de Paiement",
  },
  de: {
    invoice: "RECHNUNG", quote: "ANGEBOT",
    from: "Von", billTo: "Rechnungsempfänger",
    description: "Beschreibung", qty: "Menge", rate: "Preis", amount: "Betrag",
    subtotal: "Zwischensumme", discount: "Rabatt", tax: "Steuer", totalDue: "Gesamtbetrag", total: "Gesamt",
    notes: "Notizen / Zahlungsbedingungen",
    issueDate: "Ausstellungsdatum", dueDate: "Fälligkeitsdatum", validUntil: "Gültig Bis",
    signature: "Unterschrift", authorisedBy: "Genehmigt Von",
    poNumber: "Bestellnummer", deposit: "Anzahlung", lateFee: "Verzugsgebühr",
    paid: "Bezahlt", balanceDue: "Restbetrag", terms: "Allgemeine Geschäftsbedingungen",
    payNow: "Jetzt Bezahlen", paymentTerms: "Zahlungsbedingungen",
  },
};

export function getLabels(lang: Language): Labels {
  return labels[lang] ?? labels.en;
}
