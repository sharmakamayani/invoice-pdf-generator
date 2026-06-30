// File-based storage backend. The app always reads/writes localStorage
// synchronously (so no component changes are needed); this module mirrors that
// data to a real file on the user's drive via the File System Access API.
//
// Put that file in a Dropbox/Drive/OneDrive folder → free multi-device sync +
// backup, with no server. File System Access is Chromium-only, so localStorage
// stays the universal default and Export/Import JSON works everywhere.

import { idbGet, idbSet, idbDel } from "./idb";

export type Backend = "local" | "file";

const BACKEND_KEY = "storage_backend";
const HANDLE_KEY = "file_handle";

// The localStorage keys that make up the portable dataset (excludes API keys
// and device-local UI prefs on purpose).
export const SYNC_KEYS = [
  "invoice_history",
  "client_book",
  "catalog_items",
  "time_entries",
  "email_log",
  "invoice_draft",
  "projects",
  "expenses",
  "team_users",
  "inv_counter",
  "qte_counter",
];

const FILE_META = { _app: "invoice-generator", _v: 1 as const };

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyHandle = any;

export function fileApiAvailable(): boolean {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
}

export function getBackend(): Backend {
  if (typeof window === "undefined") return "local";
  return (localStorage.getItem(BACKEND_KEY) as Backend) || "local";
}

export function setBackend(b: Backend): void {
  localStorage.setItem(BACKEND_KEY, b);
}

function snapshot(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of SYNC_KEYS) {
    const v = localStorage.getItem(k);
    if (v != null) out[k] = v;
  }
  return out;
}

function restore(data: Record<string, string>): void {
  for (const k of SYNC_KEYS) {
    if (data[k] != null) localStorage.setItem(k, data[k]);
  }
}

function payload(): string {
  return JSON.stringify({ ...FILE_META, savedAt: new Date().toISOString(), data: snapshot() }, null, 2);
}

/** The serialised backup payload (pure — testable). */
export function serialize(): string {
  return payload();
}

let handle: AnyHandle = null;

async function getHandle(): Promise<AnyHandle> {
  if (handle) return handle;
  handle = (await idbGet<AnyHandle>(HANDLE_KEY)) ?? null;
  return handle;
}

export async function connectedFileName(): Promise<string | null> {
  const h = await getHandle();
  return h ? h.name : null;
}

/** Open a picker to create a new data file or open an existing one. */
export async function chooseFile(mode: "create" | "open"): Promise<string> {
  const w = window as any;
  const types = [{ description: "Invoice data", accept: { "application/json": [".json"] } }];
  if (mode === "create") {
    handle = await w.showSaveFilePicker({ suggestedName: "invoices.json", types });
  } else {
    const [h] = await w.showOpenFilePicker({ types, multiple: false });
    handle = h;
  }
  await idbSet(HANDLE_KEY, handle);
  return handle.name;
}

async function ensurePermission(): Promise<boolean> {
  const h = await getHandle();
  if (!h) return false;
  const opts = { mode: "readwrite" };
  if ((await h.queryPermission(opts)) === "granted") return true;
  return (await h.requestPermission(opts)) === "granted";
}

export async function writeToFile(): Promise<void> {
  const h = await getHandle();
  if (!h) throw new Error("No file connected.");
  if (!(await ensurePermission())) throw new Error("Permission to write the file was denied.");
  const writable = await h.createWritable();
  await writable.write(new Blob([payload()], { type: "application/json" }));
  await writable.close();
}

export async function readFromFile(): Promise<boolean> {
  const h = await getHandle();
  if (!h) return false;
  if (!(await ensurePermission())) return false;
  const file = await h.getFile();
  const text = await file.text();
  if (!text.trim()) return false;
  const parsed = JSON.parse(text);
  if (parsed?.data) {
    restore(parsed.data);
    return true;
  }
  return false;
}

// Debounced auto-flush — called by storage.ts after every write.
let timer: ReturnType<typeof setTimeout> | null = null;
export function scheduleSync(): void {
  if (getBackend() !== "file") return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    writeToFile().catch(() => {/* surfaced on manual save */});
  }, 800);
}

/** On app start: if the file backend is active and permission is already
 *  granted, load the file into localStorage. Otherwise flag a reconnect. */
export async function initStorage(): Promise<{ loaded: boolean; needsReconnect: boolean }> {
  if (getBackend() !== "file") return { loaded: false, needsReconnect: false };
  const h = await getHandle();
  if (!h) return { loaded: false, needsReconnect: true };
  const perm = await h.queryPermission({ mode: "readwrite" });
  if (perm !== "granted") return { loaded: false, needsReconnect: true };
  const loaded = await readFromFile();
  return { loaded, needsReconnect: false };
}

export async function disconnectFile(): Promise<void> {
  await idbDel(HANDLE_KEY);
  handle = null;
  setBackend("local");
}

// ── Universal Export / Import (works in every browser) ──────────────────────
export function exportJson(): void {
  const blob = new Blob([payload()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-backup-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importJson(file: File): Promise<void> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!parsed?.data || parsed._app !== "invoice-generator") {
    throw new Error("This doesn't look like an invoice backup file.");
  }
  restore(parsed.data);
}
