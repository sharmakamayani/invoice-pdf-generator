import type { InvoiceData, SavedClient, CatalogItem, TimeEntry, EmailLogEntry, Project, Expense } from "./types";
import { scheduleSync } from "./fileSync";

const INVOICES_KEY = "invoice_history";
const CLIENTS_KEY = "client_book";
const CATALOG_KEY = "catalog_items";
const TIME_KEY = "time_entries";
const EMAIL_LOG_KEY = "email_log";
const DRAFT_KEY = "invoice_draft";
const PROJECTS_KEY = "projects";
const EXPENSES_KEY = "expenses";

function read<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

// Every mutation routes through these so the file backend stays in sync.
function writeJSON(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
  scheduleSync();
}
function remove(key: string): void {
  localStorage.removeItem(key);
  scheduleSync();
}

// ── Invoices ────────────────────────────────────────────────────────────
export function saveInvoice(data: InvoiceData): void {
  const all = loadInvoices();
  const idx = all.findIndex((i) => i.id === data.id);
  if (idx >= 0) all[idx] = data;
  else all.unshift(data);
  writeJSON(INVOICES_KEY, all.slice(0, 200));
}

export function loadInvoices(): InvoiceData[] {
  return read<InvoiceData>(INVOICES_KEY);
}

export function deleteInvoice(id: string): void {
  writeJSON(INVOICES_KEY, loadInvoices().filter((i) => i.id !== id));
}

// ── Clients ─────────────────────────────────────────────────────────────
export function saveClient(client: SavedClient): void {
  const all = loadClients();
  const idx = all.findIndex((c) => c.id === client.id);
  if (idx >= 0) all[idx] = client;
  else all.unshift(client);
  writeJSON(CLIENTS_KEY, all);
}

export function loadClients(): SavedClient[] {
  return read<SavedClient>(CLIENTS_KEY);
}

export function deleteClient(id: string): void {
  writeJSON(CLIENTS_KEY, loadClients().filter((c) => c.id !== id));
}

// ── Catalog ─────────────────────────────────────────────────────────────
export function saveCatalogItem(item: CatalogItem): void {
  const all = loadCatalog();
  const idx = all.findIndex((c) => c.id === item.id);
  if (idx >= 0) all[idx] = item;
  else all.unshift(item);
  writeJSON(CATALOG_KEY, all);
}

export function loadCatalog(): CatalogItem[] {
  return read<CatalogItem>(CATALOG_KEY);
}

export function deleteCatalogItem(id: string): void {
  writeJSON(CATALOG_KEY, loadCatalog().filter((c) => c.id !== id));
}

// ── Time entries ────────────────────────────────────────────────────────
export function saveTimeEntry(entry: TimeEntry): void {
  const all = loadTimeEntries();
  all.unshift(entry);
  writeJSON(TIME_KEY, all);
}

export function loadTimeEntries(): TimeEntry[] {
  return read<TimeEntry>(TIME_KEY);
}

export function deleteTimeEntry(id: string): void {
  writeJSON(TIME_KEY, loadTimeEntries().filter((e) => e.id !== id));
}

export function clearTimeEntries(): void {
  writeJSON(TIME_KEY, []);
}

// ── Email log ───────────────────────────────────────────────────────────
export function logEmail(entry: EmailLogEntry): void {
  const all = loadEmailLog();
  all.unshift(entry);
  writeJSON(EMAIL_LOG_KEY, all.slice(0, 200));
}

export function loadEmailLog(): EmailLogEntry[] {
  return read<EmailLogEntry>(EMAIL_LOG_KEY);
}

// ── Projects ────────────────────────────────────────────────────────────
export function saveProject(project: Project): void {
  const all = loadProjects();
  const idx = all.findIndex((p) => p.id === project.id);
  if (idx >= 0) all[idx] = project;
  else all.unshift(project);
  writeJSON(PROJECTS_KEY, all);
}

export function loadProjects(): Project[] {
  return read<Project>(PROJECTS_KEY);
}

export function deleteProject(id: string): void {
  writeJSON(PROJECTS_KEY, loadProjects().filter((p) => p.id !== id));
}

// ── Expenses ────────────────────────────────────────────────────────────
export function saveExpense(expense: Expense): void {
  const all = loadExpenses();
  const idx = all.findIndex((e) => e.id === expense.id);
  if (idx >= 0) all[idx] = expense;
  else all.unshift(expense);
  writeJSON(EXPENSES_KEY, all);
}

export function loadExpenses(): Expense[] {
  return read<Expense>(EXPENSES_KEY);
}

export function deleteExpense(id: string): void {
  writeJSON(EXPENSES_KEY, loadExpenses().filter((e) => e.id !== id));
}

// ── Draft autosave ──────────────────────────────────────────────────────
export function saveDraft(data: InvoiceData): void {
  writeJSON(DRAFT_KEY, data);
}

export function loadDraft(): InvoiceData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  remove(DRAFT_KEY);
}
