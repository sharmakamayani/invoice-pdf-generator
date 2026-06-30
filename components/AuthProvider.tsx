"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User, Role, Permission } from "@/lib/auth";
import {
  loadUsers, currentUser, createUser, verifyPin, setSession, clearSession,
  can as canFn, ROLE_LABELS, ROLE_DESCRIPTIONS,
} from "@/lib/auth";
import { initStorage } from "@/lib/fileSync";

interface AuthCtx {
  user: User;
  can: (p: Permission) => boolean;
  logout: () => void;
}
const Ctx = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[] | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      await initStorage(); // hydrate from file backend if active, so the team loads
      setUsers(loadUsers());
      setUser(currentUser());
    })();
  }, []);

  if (users === null) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  }
  if (users.length === 0) {
    return <FirstRun onDone={(u) => { setSession(u.id); setUsers(loadUsers()); setUser(u); }} />;
  }
  if (!user) {
    return <Login users={users} onLogin={(u) => { setSession(u.id); setUser(u); }} />;
  }

  return (
    <Ctx.Provider value={{ user, can: (p) => canFn(user.role, p), logout: () => { clearSession(); setUser(null); } }}>
      {children}
    </Ctx.Provider>
  );
}

const input = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#16a34a" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12 L10 17 L19 7" /></svg>
          </div>
          <span className="font-semibold text-gray-800">Billa</span>
        </div>
        {children}
      </div>
    </div>
  );
}

function FirstRun({ onDone }: { onDone: (u: User) => void }) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!name.trim() || pin.length < 4) return;
    setBusy(true);
    const u = await createUser(name, "manager", pin); // first account is the Manager
    onDone(u);
  }

  return (
    <Shell>
      <h2 className="font-semibold text-gray-800 mb-1">Create your account</h2>
      <p className="text-xs text-gray-500 mb-4">You&apos;ll be the <span className="font-medium">Manager</span> — full access, and you can add your team afterwards.</p>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Your name</label>
      <input className={`${input} mb-3`} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kamayani" autoFocus />
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Choose a PIN (4+ digits)</label>
      <input className={`${input} mb-4`} type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="••••" />
      <button onClick={go} disabled={busy || !name.trim() || pin.length < 4} className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40">
        {busy ? "Creating…" : "Create account"}
      </button>
      <p className="text-[11px] text-gray-400 mt-4 leading-snug">
        🔒 This is device-local access control to organise your team&apos;s workflow — it locks the interface, not the data file. For server-enforced security, a hosted backend is needed.
      </p>
    </Shell>
  );
}

function Login({ users, onLogin }: { users: User[]; onLogin: (u: User) => void }) {
  const [selected, setSelected] = useState<User | null>(users.length === 1 ? users[0] : null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    if (!selected) return;
    if (await verifyPin(selected, pin)) onLogin(selected);
    else { setError("Incorrect PIN"); setPin(""); }
  }

  if (!selected) {
    return (
      <Shell>
        <h2 className="font-semibold text-gray-800 mb-3">Who&apos;s signing in?</h2>
        <div className="space-y-2">
          {users.map((u) => (
            <button key={u.id} onClick={() => setSelected(u)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors text-left">
              <span className="text-sm font-medium text-gray-700">{u.name}</span>
              <span className="text-xs text-gray-400">{ROLE_LABELS[u.role]}</span>
            </button>
          ))}
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <button onClick={() => { setSelected(null); setPin(""); setError(""); }} className="text-xs text-gray-400 hover:text-gray-600 mb-3">← Not you?</button>
      <h2 className="font-semibold text-gray-800">Hi {selected.name}</h2>
      <p className="text-xs text-gray-500 mb-4">{ROLE_LABELS[selected.role]} · {ROLE_DESCRIPTIONS[selected.role]}</p>
      <input
        className={input}
        type="password"
        inputMode="numeric"
        autoFocus
        placeholder="Enter your PIN"
        value={pin}
        onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      <button onClick={submit} disabled={pin.length < 4} className="w-full mt-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40">
        Sign in
      </button>
    </Shell>
  );
}
