export interface PaymentTerm {
  value: string;
  label: string;
  days: number | null; // null = no fixed due date (e.g. due on receipt is 0; custom is null)
}

export const paymentTerms: PaymentTerm[] = [
  { value: "receipt", label: "Due on Receipt", days: 0 },
  { value: "net7",    label: "Net 7",          days: 7 },
  { value: "net14",   label: "Net 14",         days: 14 },
  { value: "net30",   label: "Net 30",         days: 30 },
  { value: "net60",   label: "Net 60",         days: 60 },
  { value: "net90",   label: "Net 90",         days: 90 },
  { value: "cod",     label: "Cash on Delivery", days: 0 },
  { value: "custom",  label: "Custom Date",    days: null },
];

export function getTerm(value: string): PaymentTerm {
  return paymentTerms.find((t) => t.value === value) ?? paymentTerms.find((t) => t.value === "net30")!;
}

export function dueDateFromTerm(issueDate: string, termValue: string): string | null {
  const term = getTerm(termValue);
  if (term.days === null) return null; // custom — keep existing date
  const d = new Date(issueDate);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + term.days);
  return d.toISOString().split("T")[0];
}
