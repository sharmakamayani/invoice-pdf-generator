import { scheduleSync } from "./fileSync";

export type Role = "manager" | "lead" | "agent";

export interface User {
  id: string;
  name: string;
  role: Role;
  salt: string;
  pinHash: string;
}

export type Permission =
  | "manageTeam"     // add/remove users, change roles
  | "settings"       // storage backend, webhook, AI provider keys
  | "dashboard"      // revenue dashboard
  | "exports"        // CSV / tax report
  | "deleteRecords"  // delete invoices / bulk delete
  | "editInvoices"   // create & edit invoices/quotes
  | "manageRecords"; // clients, projects, expenses, time

const MATRIX: Record<Role, Permission[]> = {
  manager: ["manageTeam", "settings", "dashboard", "exports", "deleteRecords", "editInvoices", "manageRecords"],
  lead:    ["dashboard", "exports", "deleteRecords", "editInvoices", "manageRecords"],
  agent:   ["editInvoices", "manageRecords"],
};

export const ROLE_LABELS: Record<Role, string> = {
  manager: "Manager",
  lead: "Team Lead",
  agent: "Agent",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  manager: "Full access — team, settings, dashboard, delete, exports.",
  lead: "Create/edit & send, dashboard, exports, delete. No team or app settings.",
  agent: "Create/edit invoices, clients, projects, time & expenses only.",
};

export function can(role: Role, perm: Permission): boolean {
  return MATRIX[role]?.includes(perm) ?? false;
}

const USERS_KEY = "team_users";
const SESSION_KEY = "current_user_id";

export function loadUsers(): User[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  scheduleSync();
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createUser(name: string, role: Role, pin: string): Promise<User> {
  const salt = crypto.randomUUID();
  const user: User = { id: crypto.randomUUID(), name: name.trim(), role, salt, pinHash: await sha256(salt + pin) };
  const all = loadUsers();
  all.push(user);
  saveUsers(all);
  return user;
}

export async function setPin(userId: string, pin: string): Promise<void> {
  const all = loadUsers();
  const u = all.find((x) => x.id === userId);
  if (!u) return;
  u.salt = crypto.randomUUID();
  u.pinHash = await sha256(u.salt + pin);
  saveUsers(all);
}

export function updateUser(userId: string, patch: Partial<Pick<User, "name" | "role">>): void {
  const all = loadUsers();
  const u = all.find((x) => x.id === userId);
  if (!u) return;
  Object.assign(u, patch);
  saveUsers(all);
}

export function deleteUser(userId: string): void {
  saveUsers(loadUsers().filter((u) => u.id !== userId));
}

export async function verifyPin(user: User, pin: string): Promise<boolean> {
  return (await sha256(user.salt + pin)) === user.pinHash;
}

// ── Session (device-local, not synced) ──────────────────────────────────────
export function getSessionUserId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}
export function setSession(userId: string): void {
  localStorage.setItem(SESSION_KEY, userId);
}
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
export function currentUser(): User | null {
  const id = getSessionUserId();
  return loadUsers().find((u) => u.id === id) ?? null;
}
