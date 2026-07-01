export type DocumentType = "invoice" | "quote";
export type FontFamily = "Helvetica" | "Times-Roman" | "Courier";
export type PaymentStatus = "draft" | "unpaid" | "partial" | "paid" | "overdue" | "accepted";
export type DiscountType = "percentage" | "fixed";
export type WatermarkType = "none" | "PAID" | "DRAFT" | "CONFIDENTIAL";
export type TemplateType = "modern" | "minimal" | "corporate";
export type Language = "en" | "es" | "fr" | "de";
export type LineCategory = "labour" | "materials" | "expenses" | "other";
export type PaymentMethod = "cash" | "bank" | "card" | "paypal" | "stripe" | "other";
export type ExpenseCategory =
  | "software" | "hardware" | "travel" | "meals" | "office"
  | "marketing" | "subcontractor" | "fees" | "other";

export interface Discount {
  type: DiscountType;
  value: number;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  category?: LineCategory;
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  note?: string;
}

export interface DepositConfig {
  enabled: boolean;
  type: DiscountType; // percentage or fixed
  value: number;
}

export interface LateFeeConfig {
  enabled: boolean;
  type: DiscountType; // percentage of total, or fixed
  value: number;
}

export interface BusinessDetails {
  name: string;
  address: string;
  email: string;
  phone: string;
  logo?: string;
}

export interface ClientDetails {
  name: string;
  address: string;
  email: string;
}

export interface BrandingConfig {
  primaryColor: string;
  font: FontFamily;
  footerText: string;
  template: TemplateType;
  watermark: WatermarkType;
}

export interface InvoiceData {
  id: string;
  documentType: DocumentType;
  invoiceNumber: string;
  poNumber: string;
  issueDate: string;
  dueDate: string;
  paymentTerms: string; // e.g. "net30", "receipt", "custom"
  status: PaymentStatus;
  recurring: boolean;
  recurringInterval: number; // days
  lastGeneratedDate?: string;
  business: BusinessDetails;
  client: ClientDetails;
  lineItems: LineItem[];
  discount: Discount;
  deposit: DepositConfig;
  lateFee: LateFeeConfig;
  taxRate: number;
  currency: string;
  payments: Payment[];
  paymentLink: string;
  notes: string;
  terms: string; // Terms & Conditions
  signature: string;
  signatureImage?: string; // drawn/typed e-signature as a data URL
  language: Language;
  branding: BrandingConfig;
  qrData?: string;
  acceptedAt?: string;
  viewedAt?: string[];
  projectId?: string;
}

export interface SavedClient {
  id: string;
  name: string;
  address: string;
  email: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  defaultRate: number;
  category: LineCategory;
}

export interface TimeEntry {
  id: string;
  description: string;
  seconds: number;
  hourlyRate: number;
  date: string;
  projectId?: string;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  budget: number;
  currency: string;
  archived: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;
  vendor: string;
  description: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  clientName?: string;
  projectId?: string;
  billable: boolean;
  invoiced?: boolean; // added to an invoice as a billable line item
  receiptImage?: string; // data URL of the scanned receipt
  createdAt: string;
}

export interface EmailLogEntry {
  id: string;
  invoiceNumber: string;
  to: string;
  cc?: string;
  subject: string;
  sentAt: string;
  type: "send" | "reminder";
}
