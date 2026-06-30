"use client";

import { useState, useEffect } from "react";
import type { User, Role } from "@/lib/auth";
import { loadUsers, createUser, updateUser, deleteUser, setPin, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/auth";
import { useAuth } from "./AuthProvider";

const ROLES: Role[] = ["manager", "lead", "agent"];

export default function TeamManager() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("agent");
  const [pin, setPinValue] = useState("");
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");

  useEffect(() => { setUsers(loadUsers()); }, []);
  function refresh() { setUsers(loadUsers()); }

  async function add() {
    if (!name.trim() || pin.length < 4) return;
    await createUser(name, role, pin);
    setName(""); setPinValue(""); setRole("agent"); setAdding(false);
    refresh();
  }

  function changeRole(u: User, r: Role) {
    // Don't allow removing the last manager.
    if (u.role === "manager" && r !== "manager" && users.filter((x) => x.role === "manager").length === 1) {
      alert("There must be at least one Manager.");
      return;
    }
    updateUser(u.id, { role: r });
    refresh();
  }

  function remove(u: User) {
    if (u.id === me.id) { alert("You can't delete your own account while signed in."); return; }
    if (u.role === "manager" && users.filter((x) => x.role === "manager").length === 1) {
      alert("There must be at least one Manager."); return;
    }
    if (!confirm(`Remove ${u.name}?`)) return;
    deleteUser(u.id);
    refresh();
  }

  async function doReset(u: User) {
    if (newPin.length < 4) return;
    await setPin(u.id, newPin);
    setResetFor(null); setNewPin("");
    alert(`PIN reset for ${u.name}.`);
  }

  const input = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white";
  const label = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Team & Access</h2>
        {!adding && <button onClick={() => setAdding(true)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">+ Add member</button>}
      </div>

      {adding && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Name</label><input className={input} value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
            <div><label className={label}>Role</label>
              <select className={input} value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
          </div>
          <div><label className={label}>PIN (4+ digits)</label><input className={input} type="password" inputMode="numeric" value={pin} onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))} /></div>
          <p className="text-xs text-gray-400">{ROLE_DESCRIPTIONS[role]}</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setAdding(false)} className="text-sm font-semibold px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={add} disabled={!name.trim() || pin.length < 4} className="text-sm font-semibold px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40">Add</button>
          </div>
        </div>
      )}

      {users.map((u) => (
        <div key={u.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 text-sm">
                {u.name} {u.id === me.id && <span className="text-xs font-normal text-indigo-500">(you)</span>}
              </p>
              <p className="text-xs text-gray-400">{ROLE_DESCRIPTIONS[u.role]}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <select value={u.role} onChange={(e) => changeRole(u, e.target.value as Role)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white">
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <button onClick={() => setResetFor(resetFor === u.id ? null : u.id)} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">PIN</button>
              <button onClick={() => remove(u)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
            </div>
          </div>
          {resetFor === u.id && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
              <input className={input} type="password" inputMode="numeric" placeholder="New PIN (4+ digits)" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} />
              <button onClick={() => doReset(u)} disabled={newPin.length < 4} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 whitespace-nowrap">Set PIN</button>
            </div>
          )}
        </div>
      ))}

      <p className="text-[11px] text-gray-400 leading-snug pt-2">
        🔒 Roles control what each person sees and can do inside the app on this device (and any device sharing the same data file). This is workflow access control, not server-enforced security.
      </p>
    </div>
  );
}
