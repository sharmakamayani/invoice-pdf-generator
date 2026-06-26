export type DocumentType = "invoice" | "quote";
export type FontFamily = "Helvetica" | "Times-Roman" | "Courier";

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
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
}

export interface InvoiceData {
  documentType: DocumentType;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  business: BusinessDetails;
  client: ClientDetails;
  lineItems: LineItem[];
  taxRate: number;
  currency: string;
  notes: string;
  branding: BrandingConfig;
}
