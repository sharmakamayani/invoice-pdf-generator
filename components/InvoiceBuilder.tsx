"use client";

import { useState, useEffect, useRef } from "react";
import type { InvoiceData, PaymentStatus, EmailLogEntry } from "@/lib/types";
import InvoiceForm from "./InvoiceForm";
import InvoicePreview from "./InvoicePreview";
import InvoiceHistory from "./InvoiceHistory";
import ClientBook from "./ClientBook";
import Dashboard from "./Dashboard";
import TimerWidget from "./TimerWidget";
import Projects from "./Projects";
import Expenses from "./Expenses";
import ImportInvoice from "./ImportInvoice";
import StorageSettings from "./StorageSettings";
import TeamManager from "./TeamManager";
import { useAuth } from "./AuthProvider";
import { ROLE_LABELS, type Permission } from "@/lib/auth";
import { saveInvoice, saveDraft, loadDraft, logEmail } from "@/lib/storage";
import { buildShareUrl } from "@/lib/share";
import { generateDueRecurring } from "@/lib/recurring";
import { initStorage } from "@/lib/fileSync";
import { fireOnStatusChange } from "@/lib/webhook";

type Tab = "editor" | "dashboard" | "history" | "clients" | "projects" | "expenses" | "time" | "team";

function today(): string {
  return new Date().toISOString().split("T")[0];
}
function dueIn(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
function nextInvoiceNumber(type: "invoice" | "quote"): string {
  const key = type === "invoice" ? "inv_counter" : "qte_counter";
  const n = parseInt(localStorage.getItem(key) ?? "0") + 1;
  localStorage.setItem(key, String(n));
  const prefix = type === "invoice" ? "INV" : "QTE";
  return `${prefix}-${String(n).padStart(3, "0")}`;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:    { bg: "#f3f4f6", text: "#6b7280" },
  unpaid:   { bg: "#fef3c7", text: "#d97706" },
  partial:  { bg: "#dbeafe", text: "#2563eb" },
  paid:     { bg: "#d1fae5", text: "#16a34a" },
  overdue:  { bg: "#fee2e2", text: "#dc2626" },
  accepted: { bg: "#d1fae5", text: "#16a34a" },
};

function makeDefaults(): InvoiceData {
  return {
    id: "",
    documentType: "invoice",
    invoiceNumber: "INV-001",
    poNumber: "",
    issueDate: today(),
    dueDate: dueIn(30),
    paymentTerms: "net30",
    status: "draft",
    recurring: false,
    recurringInterval: 30,
    business: { name: "", address: "", email: "", phone: "", logo: undefined },
    client: { name: "", address: "", email: "" },
    lineItems: [{ id: "1", description: "", quantity: 1, rate: 0, category: "labour" }],
    discount: { type: "percentage", value: 0 },
    deposit: { enabled: false, type: "percentage", value: 50 },
    lateFee: { enabled: false, type: "percentage", value: 5 },
    taxRate: 0,
    currency: "USD",
    payments: [],
    paymentLink: "",
    notes: "",
    terms: "",
    signature: "",
    language: "en",
    branding: { primaryColor: "#4F46E5", font: "Helvetica", footerText: "Thank you for your business!", template: "modern", watermark: "none" },
  };
}

export default function InvoiceBuilder() {
  const { user, can, logout } = useAuth();
  const [data, setData] = useState<InvoiceData>(makeDefaults());
  const [tab, setTab] = useState<Tab>("editor");
  const [showPreview, setShowPreview] = useState(false);
  const [dark, setDark] = useState(false);
  const [toast, setToast] = useState("");
  const [recurringNotice, setRecurringNotice] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [showStorage, setShowStorage] = useState(false);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);

  // Initialise: hydrate from the file backend (if active), then restore draft.
  useEffect(() => {
    (async () => {
      await initStorage(); // loads file → localStorage when file backend is active & permitted
      const draft = loadDraft();
      const n = parseInt(localStorage.getItem("inv_counter") ?? "0") + 1;
      if (draft && draft.id) {
        setData(draft);
      } else {
        setData((prev) => ({ ...prev, id: crypto.randomUUID(), invoiceNumber: `INV-${String(n).padStart(3, "0")}` }));
      }
      const generated = generateDueRecurring();
      if (generated > 0) setRecurringNotice(generated);
    })();
  }, []);

  // Auto-save draft (debounced) whenever data changes.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      if (data.id) saveDraft(data);
    }, 800);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [data]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  function handleDocTypeChange(next: InvoiceData) {
    // Fire the webhook when the user transitions the status (e.g. → Paid).
    if (next.status !== data.status) {
      fireOnStatusChange(next, data.status).then((r) => {
        if (r.sent) flash("Webhook sent");
        else if (r.error) flash(`Webhook failed: ${r.error}`);
      });
    }
    if (next.documentType !== data.documentType) {
      setData({ ...next, invoiceNumber: nextInvoiceNumber(next.documentType) });
    } else {
      setData(next);
    }
  }

  function handleSave() {
    const toSave = { ...data, id: data.id || crypto.randomUUID() };
    setData(toSave);
    saveInvoice(toSave);
    flash("Saved to history");
  }

  function handleNew() {
    const n = parseInt(localStorage.getItem("inv_counter") ?? "0") + 1;
    setData({ ...makeDefaults(), id: crypto.randomUUID(), invoiceNumber: `INV-${String(n).padStart(3, "0")}` });
    setTab("editor");
    flash("New invoice started");
  }

  function handleDuplicate() {
    setData({
      ...data,
      id: crypto.randomUUID(),
      invoiceNumber: nextInvoiceNumber(data.documentType),
      status: "draft",
      payments: [],
      issueDate: today(),
      dueDate: dueIn(30),
    });
    setTab("editor");
    flash("Invoice duplicated");
  }

  function handlePrint() {
    window.print();
  }

  function handleEmail() {
    const subject = encodeURIComponent(
      `${data.documentType === "invoice" ? "Invoice" : "Quote"} #${data.invoiceNumber} from ${data.business.name || "Us"}`
    );
    const body = encodeURIComponent(
      `Hi ${data.client.name || "there"},\n\nPlease find ${
        data.documentType === "invoice" ? "invoice" : "quote"
      } #${data.invoiceNumber} attached.\n\nView it online: ${buildShareUrl(data)}\n\nRegards,\n${data.business.name || ""}`
    );
    const to = data.client.email ? encodeURIComponent(data.client.email) : "";
    const cc = data.business.email ? `&cc=${encodeURIComponent(data.business.email)}` : "";
    window.open(`mailto:${to}?subject=${subject}${cc}&body=${body}`);

    const entry: EmailLogEntry = {
      id: crypto.randomUUID(),
      invoiceNumber: data.invoiceNumber,
      to: data.client.email,
      cc: data.business.email,
      subject: `${data.documentType} #${data.invoiceNumber}`,
      sentAt: new Date().toISOString(),
      type: "send",
    };
    logEmail(entry);
    flash("Email drafted (CC'd to you)");
  }

  async function handleShare() {
    const url = buildShareUrl(data);
    try {
      await navigator.clipboard.writeText(url);
      flash("Share link copied to clipboard");
    } catch {
      window.prompt("Copy this share link:", url);
    }
  }

  function handleLoadFromHistory(inv: InvoiceData) {
    setData(inv);
    setTab("editor");
  }
  function handleSelectClient(client: InvoiceData["client"]) {
    setData((prev) => ({ ...prev, client }));
    setTab("editor");
  }

  // If the signed-in role can't access the current tab, fall back to the editor.
  useEffect(() => {
    if ((tab === "dashboard" && !can("dashboard")) || (tab === "team" && !can("manageTeam"))) {
      setTab("editor");
    }
  }, [tab, user, can]);

  const status = data.status ?? "draft";
  const statusStyle = STATUS_COLORS[status] ?? STATUS_COLORS.draft;

  const darkHeader = dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-100";
  const darkTabBar = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100";
  const btnGhost = dark
    ? "border-gray-600 text-gray-300 hover:bg-gray-700"
    : "border-gray-200 text-gray-600 hover:bg-gray-50";

  const allTabs: { key: Tab; label: string; perm?: Permission }[] = [
    { key: "editor", label: "Editor" },
    { key: "dashboard", label: "Dashboard", perm: "dashboard" },
    { key: "history", label: "History" },
    { key: "clients", label: "Clients" },
    { key: "projects", label: "Projects" },
    { key: "expenses", label: "Expenses" },
    { key: "time", label: "Time" },
    { key: "team", label: "Team", perm: "manageTeam" },
  ];
  const tabs = allTabs.filter((t) => !t.perm || can(t.perm));

  return (
    <div className={`min-h-screen flex flex-col ${dark ? "dark-mode" : ""}`} style={{ background: dark ? "#0b1220" : undefined }}>
      {/* Storage settings modal */}
      {showStorage && (
        <StorageSettings onClose={() => setShowStorage(false)} onReload={() => window.location.reload()} />
      )}

      {/* Import / OCR modal */}
      {showImport && (
        <ImportInvoice
          current={data}
          onApply={(merged) => { setData(merged); setTab("editor"); flash("Form filled from scan — please review"); }}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}

      {/* Recurring banner */}
      {recurringNotice > 0 && (
        <div className="bg-indigo-600 text-white text-sm px-4 py-2 flex items-center justify-between">
          <span>🔄 {recurringNotice} recurring invoice{recurringNotice > 1 ? "s" : ""} auto-generated and saved to History.</span>
          <button onClick={() => setRecurringNotice(0)} className="text-white/80 hover:text-white">×</button>
        </div>
      )}

      {/* Top bar */}
      <header className={`sticky top-0 z-30 border-b shadow-sm ${darkHeader}`}>
        <div className="max-w-screen-2xl mx-auto px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 mr-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#16a34a" }} aria-label="Billa">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12 L10 17 L19 7" />
              </svg>
            </div>
            <span className={`font-semibold text-sm ${dark ? "text-white" : "text-gray-800"}`}>Billa</span>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize" style={{ background: statusStyle.bg, color: statusStyle.text }}>
            {status}
          </span>

          <div className="flex-1" />

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleNew} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${btnGhost}`}>New</button>
            <button onClick={() => setShowImport(true)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">⎙ Scan</button>
            <button onClick={handleSave} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">Save</button>
            <button onClick={handleDuplicate} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${btnGhost}`}>Duplicate</button>
            <button onClick={handleShare} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${btnGhost}`}>Share</button>
            <button onClick={handleEmail} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${btnGhost}`}>Email</button>
            <button onClick={handlePrint} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${btnGhost}`}>Print</button>
            {can("settings") && (
              <button onClick={() => setShowStorage(true)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${btnGhost}`} title="Settings, backup & integrations">⚙ Settings</button>
            )}
            <button onClick={() => setDark((v) => !v)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${dark ? "border-gray-600 bg-gray-700 text-yellow-300" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`} title="Toggle dark mode">
              {dark ? "☀ Light" : "☾ Dark"}
            </button>
            <button className={`lg:hidden text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${btnGhost}`} onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? "← Edit" : "Preview →"}
            </button>

            {/* User chip + logout */}
            <div className="flex items-center gap-2 pl-2 ml-1 border-l border-gray-200/60">
              <div className="text-right leading-tight hidden sm:block">
                <p className={`text-xs font-semibold ${dark ? "text-gray-200" : "text-gray-700"}`}>{user.name}</p>
                <p className="text-[10px] text-gray-400">{ROLE_LABELS[user.role]}</p>
              </div>
              <button onClick={logout} title="Sign out" className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${btnGhost}`}>Sign out</button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`border-t ${darkTabBar}`}>
          <div className="max-w-screen-2xl mx-auto px-4 flex gap-0 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.key
                    ? "border-indigo-500 text-indigo-600"
                    : dark
                    ? "border-transparent text-gray-400 hover:text-gray-200"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      {tab === "team" && can("manageTeam") ? (
        <div className="flex-1 max-w-2xl mx-auto w-full p-4 lg:p-6" style={{ background: dark ? "#0f172a" : undefined }}>
          <TeamManager />
        </div>
      ) : tab === "dashboard" ? (
        <div className="flex-1 max-w-4xl mx-auto w-full p-4 lg:p-6" style={{ background: dark ? "#0f172a" : undefined }}>
          <Dashboard dark={dark} />
        </div>
      ) : tab === "history" ? (
        <div className="flex-1 max-w-2xl mx-auto w-full p-4 lg:p-6" style={{ background: dark ? "#0f172a" : undefined }}>
          <InvoiceHistory onLoad={handleLoadFromHistory} />
        </div>
      ) : tab === "clients" ? (
        <div className="flex-1 max-w-2xl mx-auto w-full p-4 lg:p-6" style={{ background: dark ? "#0f172a" : undefined }}>
          <ClientBook onSelect={handleSelectClient} currentClient={data.client} />
        </div>
      ) : tab === "projects" ? (
        <div className="flex-1 max-w-2xl mx-auto w-full p-4 lg:p-6" style={{ background: dark ? "#0f172a" : undefined }}>
          <Projects />
        </div>
      ) : tab === "expenses" ? (
        <div className="flex-1 max-w-2xl mx-auto w-full p-4 lg:p-6" style={{ background: dark ? "#0f172a" : undefined }}>
          <Expenses />
        </div>
      ) : tab === "time" ? (
        <div className="flex-1 max-w-2xl mx-auto w-full p-4 lg:p-6" style={{ background: dark ? "#0f172a" : undefined }}>
          <TimerWidget onAddToInvoice={(items) => { setData((prev) => ({ ...prev, lineItems: [...prev.lineItems.filter((li) => li.description), ...items] })); setTab("editor"); flash("Time added to invoice"); }} />
        </div>
      ) : (
        <div className="flex-1 max-w-screen-2xl mx-auto w-full flex">
          <div className={`w-full lg:w-[44%] lg:flex-shrink-0 overflow-y-auto p-4 lg:p-6 ${showPreview ? "hidden lg:block" : "block"}`} style={{ height: "calc(100vh - 97px)", background: dark ? "#0f172a" : undefined }}>
            <InvoiceForm data={data} onChange={handleDocTypeChange} />
            <div className="h-8" />
          </div>
          <div className={`flex-1 lg:flex-auto border-l ${showPreview ? "block" : "hidden lg:block"} ${dark ? "border-gray-700" : "border-gray-100 bg-gray-50"}`} style={{ height: "calc(100vh - 97px)", background: dark ? "#0f172a" : undefined }}>
            <InvoicePreview data={data} />
          </div>
        </div>
      )}
    </div>
  );
}
