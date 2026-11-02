import { useState, useEffect, useCallback, useRef } from "react";

// ── Supabase ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function sb(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string>
) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
  if (method === "POST") {
    headers["Content-Type"] = "application/json";
    headers["Prefer"] = "return=representation";
  } else if (method === "PATCH" || method === "DELETE") {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHLY_SALARY = 1500;
const ALYA_SHARE = 750;
const NINA_SHARE = 750;
const STAFF_NAME = "Eman";
const NOTE_OPTIONS = ["Payout", "Advance", "Borrow", "Bonus"];
const ADMIN_PIN = "1234";
const VACUUM_RATE = 60;
const DEEPCLEAN_RATE = 180;

const ALYA_COLOR = "#7c3aed";
const ALYA_BG = "#faf5ff";
const ALYA_BORDER = "#ede9fe";
const NINA_COLOR = "#db2777";
const NINA_BG = "#fdf2f8";
const NINA_BORDER = "#fce7f3";

const c = {
  surface: "#ffffff",
  border: "#e5e7eb",
  text: "#111827",
  muted: "#6b7280",
  subtle: "#f9fafb",
  accent: "#4f46e5",
  success: "#059669",
  warn: "#d97706",
  danger: "#dc2626",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtMonth(m: string) {
  if (!m) return "";
  const [y, mo] = m.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(mo) - 1]} ${y}`;
}

function getFridayOptions(existingDates: string[] = [], editingDate: string | null = null) {
  const fridays: string[] = [];
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 28);
  // align to Friday
  while (start.getDay() !== 5) start.setDate(start.getDate() + 1);
  const end = new Date(now);
  end.setDate(now.getDate() + 84);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 7)) {
    const s = d.toISOString().slice(0, 10);
    if (!existingDates.includes(s) || s === editingDate) {
      fridays.push(s);
    }
  }
  return fridays;
}

function getDeepCleanMonthOptions(existingMonths: string[] = [], editingMonth: string | null = null) {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!existingMonths.includes(s) || s === editingMonth) {
      months.push(s);
    }
  }
  return months;
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: c.surface,
  border: `1px solid ${c.border}`,
  borderRadius: 12,
  padding: "16px 20px",
};

const inp: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: `1px solid ${c.border}`,
  borderRadius: 8,
  fontSize: 14,
  background: "#ffffff",
  color: c.text,
  outline: "none",
  boxSizing: "border-box" as const,
};

const sel: React.CSSProperties = {
  ...inp,
  appearance: "none" as const,
  WebkitAppearance: "none" as const,
  cursor: "pointer",
  color: c.text,
};

// ── Small components ──────────────────────────────────────────────────────────
function Lbl({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize: 12, fontWeight: 600, color: c.muted, letterSpacing: "0.05em", textTransform: "uppercase" as const, display: "block", marginBottom: 6 }}>{children}</label>;
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: color + "22", color }}>
      {label}
    </span>
  );
}

function Btn({
  children, onClick, variant = "primary", size = "md", disabled = false, style: extra,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600, transition: "opacity 0.15s", opacity: disabled ? 0.5 : 1,
    padding: size === "sm" ? "6px 12px" : "10px 18px",
    fontSize: size === "sm" ? 13 : 14,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: c.accent, color: "#fff" },
    secondary: { background: c.subtle, color: c.text, border: `1px solid ${c.border}` },
    danger: { background: c.danger, color: "#fff" },
    ghost: { background: "transparent", color: c.muted },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...extra }}>{children}</button>;
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ background: "#f3f4f6", borderRadius: 999, height: 8, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width 0.4s" }} />
    </div>
  );
}

function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: type === "success" ? c.success : c.danger, color: "#fff",
      padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 9999, whiteSpace: "nowrap",
    }}>
      {msg}
      <button onClick={onClose} style={{ marginLeft: 12, background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 16 }}>×</button>
    </div>
  );
}

function ConfirmDialog({ msg, onConfirm, onCancel }: { msg: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998 }}>
      <div style={{ ...card, maxWidth: 320, width: "90%", textAlign: "center" }}>
        <p style={{ marginBottom: 20, color: c.text }}>{msg}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
          <Btn variant="danger" onClick={onConfirm}>Delete</Btn>
        </div>
      </div>
    </div>
  );
}

function MonthPills({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  const months: string[] = [];
  const now = new Date();
  for (let i = -5; i <= 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 16 }}>
      {months.map((m) => (
        <button key={m} onClick={() => onChange(m)} style={{
          padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600,
          border: `1px solid ${value === m ? c.accent : c.border}`,
          background: value === m ? c.accent : c.surface,
          color: value === m ? "#fff" : c.muted,
          cursor: "pointer",
        }}>
          {fmtMonth(m)}
        </button>
      ))}
    </div>
  );
}

function SelectArrow() {
  return (
    <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: c.muted }}>
      ▾
    </div>
  );
}

// ── CalendarPicker ────────────────────────────────────────────────────────────
function CalendarPicker({
  value,
  onChange,
  allowedDates,
  monthMode = false,
  allowedMonths,
}: {
  value: string;
  onChange: (v: string) => void;
  allowedDates?: string[];
  monthMode?: boolean;
  allowedMonths?: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const parseNav = () => {
    if (value) {
      const d = new Date(value + (monthMode ? "-01" : "") + "T00:00:00");
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  };

  const [nav, setNav] = useState(parseNav);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

  if (monthMode) {
    // Show a year grid of months, navigate by year
    return (
      <div ref={ref} style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          style={{
            ...inp,
            textAlign: "left" as const,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{value ? fmtMonth(value) : "Select month"}</span>
          <span style={{ color: c.muted }}>📅</span>
        </button>
        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 1000,
            background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 12, minWidth: 220,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <button type="button" onClick={() => setNav(n => ({ ...n, year: n.year - 1 }))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "4px 8px", color: c.text }}>‹</button>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{nav.year}</span>
              <button type="button" onClick={() => setNav(n => ({ ...n, year: n.year + 1 }))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "4px 8px", color: c.text }}>›</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
              {MONTHS.map((m, i) => {
                const key = `${nav.year}-${String(i + 1).padStart(2, "0")}`;
                const allowed = allowedMonths ? allowedMonths.includes(key) : true;
                const selected = value === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!allowed}
                    onClick={() => { onChange(key); setOpen(false); }}
                    style={{
                      padding: "8px 4px", borderRadius: 8, border: "none", cursor: allowed ? "pointer" : "not-allowed",
                      fontWeight: selected ? 700 : 400, fontSize: 13,
                      background: selected ? c.accent : "transparent",
                      color: selected ? "#fff" : allowed ? c.text : "#d1d5db",
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Day picker
  const firstDay = new Date(nav.year, nav.month, 1).getDay();
  const daysInMonth = new Date(nav.year, nav.month + 1, 0).getDate();
  const todayStr = today();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          ...inp,
          textAlign: "left" as const,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>{value ? fmtDate(value) : "Select date"}</span>
        <span style={{ color: c.muted }}>📅</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 1000,
          background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 12, minWidth: 260,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <button type="button" onClick={() => setNav(n => {
              const d = new Date(n.year, n.month - 1, 1);
              return { year: d.getFullYear(), month: d.getMonth() };
            })} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "4px 8px", color: c.text }}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{MONTHS[nav.month]} {nav.year}</span>
            <button type="button" onClick={() => setNav(n => {
              const d = new Date(n.year, n.month + 1, 1);
              return { year: d.getFullYear(), month: d.getMonth() };
            })} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "4px 8px", color: c.text }}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
            {DAYS.map(d => <div key={d} style={{ textAlign: "center" as const, fontSize: 11, fontWeight: 700, color: c.muted, padding: "2px 0" }}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} />;
              const dateStr = `${nav.year}-${String(nav.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const allowed = allowedDates ? allowedDates.includes(dateStr) : true;
              const selected = value === dateStr;
              const isToday = dateStr === todayStr;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!allowed}
                  onClick={() => { onChange(dateStr); setOpen(false); }}
                  style={{
                    padding: "6px 2px", borderRadius: 6, border: "none",
                    cursor: allowed ? "pointer" : "default",
                    fontWeight: selected ? 700 : 400, fontSize: 13,
                    background: selected ? c.accent : isToday ? "#f3f4f6" : "transparent",
                    color: selected ? "#fff" : allowed ? c.text : "#d1d5db",
                    textAlign: "center" as const,
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <div style={{ width: 32, height: 32, borderRadius: "50%", background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color, flexShrink: 0 }}>
      {name[0]}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ textAlign: "center" as const, padding: "40px 0", color: c.muted }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 14 }}>{text}</div>
    </div>
  );
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (role: "admin" | "eman") => void }) {
  const [tab, setTab] = useState<"admin" | "eman">("admin");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);

  const locked = Date.now() < lockUntil;

  function handleAdminLogin() {
    if (locked) return;
    if (pin === ADMIN_PIN) {
      setError("");
      onLogin("admin");
    } else {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= 3) {
        setLockUntil(Date.now() + 30000);
        setAttempts(0);
        setError("Too many attempts. Wait 30 seconds.");
      } else {
        setError(`Incorrect PIN. ${3 - next} attempt(s) left.`);
      }
      setPin("");
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 20 }}>
      <div style={{ ...card, width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center" as const, marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🐱</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: c.text, margin: 0 }}>Rumah Kucen Payroll</h1>
          <p style={{ color: c.muted, fontSize: 14, marginTop: 4 }}>Staff salary management</p>
        </div>

        <div style={{ display: "flex", background: c.subtle, borderRadius: 8, padding: 4, marginBottom: 20 }}>
          {(["admin", "eman"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setPin(""); setError(""); }} style={{
              flex: 1, padding: "8px", border: "none", borderRadius: 6, cursor: "pointer",
              fontWeight: 600, fontSize: 14,
              background: tab === t ? c.surface : "transparent",
              color: tab === t ? c.text : c.muted,
              boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.2s",
            }}>
              {t === "admin" ? "👤 Admin" : `👷 ${STAFF_NAME}`}
            </button>
          ))}
        </div>

        {tab === "admin" ? (
          <div>
            <Lbl>Admin PIN</Lbl>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.slice(0, 4))}
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
              placeholder="Enter 4-digit PIN"
              disabled={locked}
              style={{ ...inp, marginBottom: 8, letterSpacing: "0.3em" }}
            />
            {error && <p style={{ color: c.danger, fontSize: 13, margin: "0 0 10px" }}>{error}</p>}
            <Btn onClick={handleAdminLogin} disabled={locked} style={{ width: "100%" }}>
              {locked ? "Locked — wait 30s" : "Login"}
            </Btn>
          </div>
        ) : (
          <div>
            <p style={{ color: c.muted, fontSize: 14, marginBottom: 16 }}>View your salary history and payment status.</p>
            <Btn onClick={() => onLogin("eman")} style={{ width: "100%" }}>Continue as {STAFF_NAME}</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Salary Types ──────────────────────────────────────────────────────────────
interface Payment {
  id: string;
  payment_date: string;
  for_month: string;
  paid_by: string;
  amount: number;
  note: string;
}

interface VacuumEntry {
  id: string;
  friday_date: string;
  paid: boolean;
  paid_date: string | null;
  partial: boolean;
  remark: string;
}

interface DeepCleanEntry {
  id: string;
  for_month: string;
  paid: boolean;
  paid_date: string | null;
  partial: boolean;
  remark: string;
}

// ── Cleaning Page ─────────────────────────────────────────────────────────────
function entryBg(paid: boolean, partial: boolean) {
  if (paid) return "#f0fdf4";
  if (partial) return "#fffbeb";
  return "#ffffff";
}

function CleaningPage({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<"vacuum" | "deep">("vacuum");
  const [vacuums, setVacuums] = useState<VacuumEntry[]>([]);
  const [deeps, setDeeps] = useState<DeepCleanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; table: string } | null>(null);

  // Vacuum form
  const [showVacForm, setShowVacForm] = useState(false);
  const [editVac, setEditVac] = useState<VacuumEntry | null>(null);
  const [vacDate, setVacDate] = useState("");
  const [vacPaid, setVacPaid] = useState(false);
  const [vacPartial, setVacPartial] = useState(false);
  const [vacPaidDate, setVacPaidDate] = useState(today());
  const [vacAmountPaid, setVacAmountPaid] = useState("");

  // Deep form
  const [showDeepForm, setShowDeepForm] = useState(false);
  const [editDeep, setEditDeep] = useState<DeepCleanEntry | null>(null);
  const [deepMonth, setDeepMonth] = useState(currentMonth());
  const [deepPaid, setDeepPaid] = useState(false);
  const [deepPartial, setDeepPartial] = useState(false);
  const [deepPaidDate, setDeepPaidDate] = useState(today());
  const [deepAmountPaid, setDeepAmountPaid] = useState("");

  const showToast = useCallback((msg: string, type: "success" | "error") => {
    setToast({ msg, type });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [v, d] = await Promise.all([
        sb("GET", "cleaning_vacuum", undefined, { order: "friday_date.desc" }),
        sb("GET", "cleaning_deepclean", undefined, { order: "for_month.desc" }),
      ]);
      setVacuums(v || []);
      setDeeps(d || []);
    } catch {
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  function openVacAdd() {
    setEditVac(null);
    setVacDate("");
    setVacPaid(false);
    setVacPartial(false);
    setVacPaidDate(today());
    setVacAmountPaid("");
    setShowVacForm(true);
  }

  function openVacEdit(v: VacuumEntry) {
    setEditVac(v);
    setVacDate(v.friday_date);
    setVacPaid(v.paid);
    setVacPartial(v.partial || false);
    setVacPaidDate(v.paid_date || today());
    setVacAmountPaid(v.remark || "");
    setShowVacForm(true);
  }

  function openDeepAdd() {
    setEditDeep(null);
    const used = deeps.map((d) => d.for_month);
    const opts = getDeepCleanMonthOptions(used);
    setDeepMonth(opts[0] || currentMonth());
    setDeepPaid(false);
    setDeepPartial(false);
    setDeepPaidDate(today());
    setDeepAmountPaid("");
    setShowDeepForm(true);
  }

  function openDeepEdit(d: DeepCleanEntry) {
    setEditDeep(d);
    setDeepMonth(d.for_month);
    setDeepPaid(d.paid);
    setDeepPartial(d.partial || false);
    setDeepPaidDate(d.paid_date || today());
    setDeepAmountPaid(d.remark || "");
    setShowDeepForm(true);
  }

  async function saveVacuum() {
    if (!vacDate) { showToast("Please select a Friday date", "error"); return; }
    const effectivePaid = vacPaid && !vacPartial;
    try {
      const payload = {
        friday_date: vacDate,
        paid: effectivePaid,
        partial: vacPartial,
        paid_date: (effectivePaid || vacPartial) ? vacPaidDate : null,
        remark: vacAmountPaid,
      };
      if (editVac) {
        await sb("PATCH", `cleaning_vacuum?id=eq.${editVac.id}`, payload);
      } else {
        await sb("POST", "cleaning_vacuum", payload);
      }
      showToast(editVac ? "Entry updated" : "Entry added", "success");
      setShowVacForm(false);
      load();
    } catch {
      showToast("Failed to save entry", "error");
    }
  }

  async function saveDeep() {
    if (!deepMonth) { showToast("Please select a month", "error"); return; }
    const effectivePaid = deepPaid && !deepPartial;
    try {
      const payload = {
        for_month: deepMonth,
        paid: effectivePaid,
        partial: deepPartial,
        paid_date: (effectivePaid || deepPartial) ? deepPaidDate : null,
        remark: deepAmountPaid,
      };
      if (editDeep) {
        await sb("PATCH", `cleaning_deepclean?id=eq.${editDeep.id}`, payload);
      } else {
        await sb("POST", "cleaning_deepclean", payload);
      }
      showToast(editDeep ? "Entry updated" : "Entry added", "success");
      setShowDeepForm(false);
      load();
    } catch {
      showToast("Failed to save entry", "error");
    }
  }

  async function markFullyPaid(id: string, table: string) {
    try {
      await sb("PATCH", `${table}?id=eq.${id}`, {
        paid: true,
        partial: false,
        paid_date: today(),
        remark: "",
      });
      showToast("Marked as fully paid", "success");
      load();
    } catch {
      showToast("Failed to update", "error");
    }
  }

  async function deleteEntry() {
    if (!confirm) return;
    try {
      await sb("DELETE", `${confirm.table}?id=eq.${confirm.id}`);
      showToast("Deleted", "success");
      setConfirm(null);
      load();
    } catch {
      showToast("Failed to delete", "error");
    }
  }

  const vacuumDates = vacuums.map((v) => v.friday_date);
  const fridayOptions = getFridayOptions(vacuumDates, editVac?.friday_date || null);
  const deepMonths = deeps.map((d) => d.for_month);
  const deepMonthOptions = getDeepCleanMonthOptions(deepMonths, editDeep?.for_month || null);

  const paidVacuums = vacuums.filter((v) => v.paid).length;
  const partialVacuums = vacuums.filter((v) => v.partial).length;
  const paidDeeps = deeps.filter((d) => d.paid).length;
  const partialDeeps = deeps.filter((d) => d.partial).length;

  // Group vacuums by month
  const vacuumsByMonth: Record<string, VacuumEntry[]> = {};
  vacuums.forEach((v) => {
    const m = v.friday_date.slice(0, 7);
    if (!vacuumsByMonth[m]) vacuumsByMonth[m] = [];
    vacuumsByMonth[m].push(v);
  });
  const vacuumMonths = Object.keys(vacuumsByMonth).sort((a, b) => b.localeCompare(a));

  // Shared form section for payment status
  function PaymentStatusFields({
    paid, onPaid, partial, onPartial, paidDate, onPaidDate, amountPaid, onAmountPaid, rate,
  }: {
    paid: boolean; onPaid: (v: boolean) => void;
    partial: boolean; onPartial: (v: boolean) => void;
    paidDate: string; onPaidDate: (v: string) => void;
    amountPaid: string; onAmountPaid: (v: string) => void;
    rate: number;
  }) {
    const amt = Number(amountPaid);
    return (
      <>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 8 }}>
            <input type="checkbox" checked={paid && !partial} onChange={(e) => { onPaid(e.target.checked); if (e.target.checked) onPartial(false); }}
              style={{ width: 18, height: 18, cursor: "pointer", accentColor: c.success }} />
            <span style={{ fontWeight: 600, fontSize: 14, color: c.success }}>✅ Fully Paid</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={partial} onChange={(e) => { onPartial(e.target.checked); if (e.target.checked) onPaid(false); }}
              style={{ width: 18, height: 18, cursor: "pointer", accentColor: c.warn }} />
            <span style={{ fontWeight: 600, fontSize: 14, color: c.warn }}>🟡 Partial Payment</span>
          </label>
        </div>
        {(paid || partial) && (
          <div style={{ marginBottom: 12 }}>
            <Lbl>Payment Date</Lbl>
            <CalendarPicker value={paidDate} onChange={onPaidDate} />
          </div>
        )}
        {partial && (
          <div style={{ marginBottom: 12 }}>
            <Lbl>Amount Paid (RM)</Lbl>
            <input
              type="number"
              min="0"
              max={rate}
              value={amountPaid}
              onChange={(e) => onAmountPaid(e.target.value)}
              placeholder={`e.g. ${rate / 2}`}
              style={{ ...inp, background: "#ffffff" }}
            />
            {amountPaid && !isNaN(amt) && amt > 0 && (
              <div style={{ fontSize: 12, color: c.muted, marginTop: 4 }}>
                Balance: RM{rate - amt}
              </div>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <div style={{ padding: "0 0 40px" }}>
      {/* Header stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ ...card, borderTop: `3px solid ${c.accent}` }}>
          <div style={{ fontSize: 12, color: c.muted, fontWeight: 600, marginBottom: 4 }}>VACUUM</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: c.text }}>{paidVacuums}<span style={{ fontSize: 14, color: c.muted, fontWeight: 400 }}>/{vacuums.length}</span></div>
          <div style={{ fontSize: 12, color: c.muted }}>
            RM{paidVacuums * VACUUM_RATE} paid
            {partialVacuums > 0 && <span style={{ color: c.warn }}> · {partialVacuums} partial</span>}
          </div>
        </div>
        <div style={{ ...card, borderTop: `3px solid ${c.success}` }}>
          <div style={{ fontSize: 12, color: c.muted, fontWeight: 600, marginBottom: 4 }}>DEEP CLEAN</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: c.text }}>{paidDeeps}<span style={{ fontSize: 14, color: c.muted, fontWeight: 400 }}>/{deeps.length}</span></div>
          <div style={{ fontSize: 12, color: c.muted }}>
            RM{paidDeeps * DEEPCLEAN_RATE} paid
            {partialDeeps > 0 && <span style={{ color: c.warn }}> · {partialDeeps} partial</span>}
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", background: c.subtle, borderRadius: 8, padding: 4, marginBottom: 20 }}>
        {(["vacuum", "deep"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "8px", border: "none", borderRadius: 6, cursor: "pointer",
            fontWeight: 600, fontSize: 14,
            background: tab === t ? c.surface : "transparent",
            color: tab === t ? c.text : c.muted,
            boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            transition: "all 0.2s",
          }}>
            {t === "vacuum" ? `🧹 Vacuum (RM${VACUUM_RATE})` : `✨ Deep Clean (RM${DEEPCLEAN_RATE})`}
          </button>
        ))}
      </div>

      {/* Vacuum tab */}
      {tab === "vacuum" && (
        <div>
          {isAdmin && !showVacForm && (
            <Btn onClick={openVacAdd} style={{ marginBottom: 16, width: "100%" }}>
              + Add Friday Entry
            </Btn>
          )}

          {showVacForm && isAdmin && (
            <div style={{ ...card, marginBottom: 16, background: c.subtle }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>
                {editVac ? "Edit Vacuum Entry" : "Add Vacuum Entry"}
              </h3>
              <div style={{ marginBottom: 12 }}>
                <Lbl>Friday Date</Lbl>
                <CalendarPicker value={vacDate} onChange={setVacDate} allowedDates={fridayOptions} />
              </div>
              <PaymentStatusFields
                paid={vacPaid} onPaid={setVacPaid}
                partial={vacPartial} onPartial={setVacPartial}
                paidDate={vacPaidDate} onPaidDate={setVacPaidDate}
                amountPaid={vacAmountPaid} onAmountPaid={setVacAmountPaid}
                rate={VACUUM_RATE}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={saveVacuum}>Save</Btn>
                <Btn variant="secondary" onClick={() => setShowVacForm(false)}>Cancel</Btn>
              </div>
            </div>
          )}

          {loading ? (
            <EmptyState icon="⏳" text="Loading..." />
          ) : vacuums.length === 0 ? (
            <EmptyState icon="🧹" text="No vacuum entries yet" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
              {vacuumMonths.map((month) => (
                <div key={month}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: c.muted, letterSpacing: "0.06em", textTransform: "uppercase" as const, marginBottom: 8 }}>
                    {fmtMonth(month)}
                  </div>
                  <div style={{ ...card, padding: 0, overflow: "hidden" }}>
                    {vacuumsByMonth[month].map((v, idx) => (
                      <div key={v.id} style={{
                        display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px",
                        borderBottom: idx < vacuumsByMonth[month].length - 1 ? `1px solid ${c.border}` : "none",
                        background: entryBg(v.paid, v.partial || false),
                      }}>
                        <div style={{ paddingTop: 2 }}>
                          {v.paid
                            ? <span style={{ fontSize: 18 }}>✅</span>
                            : v.partial
                              ? <span style={{ fontSize: 18 }}>🟡</span>
                              : <span style={{ fontSize: 18, opacity: 0.3 }}>⬜</span>
                          }
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: c.text }}>
                            {fmtDate(v.friday_date)}
                          </div>
                          <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>
                            {v.paid ? (v.paid_date ? `Paid on ${fmtDate(v.paid_date)}` : "Fully paid")
                              : v.partial ? (v.paid_date ? `Partial — ${fmtDate(v.paid_date)}` : "Partial payment")
                                : "Unpaid"}
                            {" · "}RM{VACUUM_RATE}
                          </div>
                          {v.partial && v.remark && !isNaN(Number(v.remark)) && Number(v.remark) > 0 && (
                            <div style={{ fontSize: 12, color: c.warn, marginTop: 3, fontWeight: 500 }}>
                              Paid RM{v.remark}. Balance RM{VACUUM_RATE - Number(v.remark)}.
                            </div>
                          )}
                        </div>
                        {isAdmin && (
                          <div style={{ display: "flex", flexDirection: "column" as const, gap: 6, flexShrink: 0 }}>
                            {v.partial && (
                              <Btn size="sm" variant="primary" onClick={() => markFullyPaid(v.id, "cleaning_vacuum")}
                                style={{ background: c.success, whiteSpace: "nowrap" as const }}>
                                ✅ Paid
                              </Btn>
                            )}
                            <div style={{ display: "flex", gap: 6 }}>
                              <Btn size="sm" variant="secondary" onClick={() => openVacEdit(v)}>Edit</Btn>
                              <Btn size="sm" variant="danger" onClick={() => setConfirm({ id: v.id, table: "cleaning_vacuum" })}>Del</Btn>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Deep Clean tab */}
      {tab === "deep" && (
        <div>
          {isAdmin && !showDeepForm && (
            <Btn onClick={openDeepAdd} style={{ marginBottom: 16, width: "100%" }}>
              + Add Deep Clean Entry
            </Btn>
          )}

          {showDeepForm && isAdmin && (
            <div style={{ ...card, marginBottom: 16, background: c.subtle }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>
                {editDeep ? "Edit Deep Clean Entry" : "Add Deep Clean Entry"}
              </h3>
              <div style={{ marginBottom: 12 }}>
                <Lbl>For Month</Lbl>
                <CalendarPicker value={deepMonth} onChange={setDeepMonth} monthMode allowedMonths={deepMonthOptions} />
              </div>
              <PaymentStatusFields
                paid={deepPaid} onPaid={setDeepPaid}
                partial={deepPartial} onPartial={setDeepPartial}
                paidDate={deepPaidDate} onPaidDate={setDeepPaidDate}
                amountPaid={deepAmountPaid} onAmountPaid={setDeepAmountPaid}
                rate={DEEPCLEAN_RATE}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={saveDeep}>Save</Btn>
                <Btn variant="secondary" onClick={() => setShowDeepForm(false)}>Cancel</Btn>
              </div>
            </div>
          )}

          {loading ? (
            <EmptyState icon="⏳" text="Loading..." />
          ) : deeps.length === 0 ? (
            <EmptyState icon="✨" text="No deep clean entries yet" />
          ) : (
            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              {deeps.map((d, idx) => (
                <div key={d.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px",
                  borderBottom: idx < deeps.length - 1 ? `1px solid ${c.border}` : "none",
                  background: entryBg(d.paid, d.partial || false),
                }}>
                  <div style={{ paddingTop: 2 }}>
                    {d.paid
                      ? <span style={{ fontSize: 18 }}>✅</span>
                      : d.partial
                        ? <span style={{ fontSize: 18 }}>🟡</span>
                        : <span style={{ fontSize: 18, opacity: 0.3 }}>⬜</span>
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: c.text }}>
                      {fmtMonth(d.for_month)}
                    </div>
                    <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>
                      {d.paid ? (d.paid_date ? `Paid on ${fmtDate(d.paid_date)}` : "Fully paid")
                        : d.partial ? (d.paid_date ? `Partial — ${fmtDate(d.paid_date)}` : "Partial payment")
                          : "Unpaid"}
                      {" · "}RM{DEEPCLEAN_RATE}
                    </div>
                    {d.partial && d.remark && !isNaN(Number(d.remark)) && Number(d.remark) > 0 && (
                      <div style={{ fontSize: 12, color: c.warn, marginTop: 3, fontWeight: 500 }}>
                        Paid RM{d.remark}. Balance RM{DEEPCLEAN_RATE - Number(d.remark)}.
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 6, flexShrink: 0 }}>
                      {d.partial && (
                        <Btn size="sm" variant="primary" onClick={() => markFullyPaid(d.id, "cleaning_deepclean")}
                          style={{ background: c.success, whiteSpace: "nowrap" as const }}>
                          ✅ Paid
                        </Btn>
                      )}
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn size="sm" variant="secondary" onClick={() => openDeepEdit(d)}>Edit</Btn>
                        <Btn size="sm" variant="danger" onClick={() => setConfirm({ id: d.id, table: "cleaning_deepclean" })}>Del</Btn>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirm && <ConfirmDialog msg="Delete this entry?" onConfirm={deleteEntry} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

// ── Eman Salary View ──────────────────────────────────────────────────────────
function EmanSalaryView() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    sb("GET", "salary_payments", undefined, {
      order: "payment_date.desc",
      for_month: `eq.${month}`,
    })
      .then((data) => setPayments(data || []))
      .finally(() => setLoading(false));
  }, [month]);

  const total = payments.reduce((s, p) => s + p.amount, 0);
  const advances = payments.filter((p) => p.note === "Advance");
  const totalAdvance = advances.reduce((s, p) => s + p.amount, 0);
  const remaining = MONTHLY_SALARY - total;

  return (
    <div style={{ padding: "0 0 40px" }}>
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: c.muted, fontWeight: 600, marginBottom: 4 }}>MONTHLY SALARY</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: c.text }}>RM{MONTHLY_SALARY}</div>
        <ProgressBar value={total} max={MONTHLY_SALARY} color={total >= MONTHLY_SALARY ? c.success : c.accent} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13, color: c.muted }}>
          <span>Paid: RM{total}</span>
          <span>Remaining: RM{Math.max(0, remaining)}</span>
        </div>
        {totalAdvance > 0 && (
          <div style={{ marginTop: 8, padding: "6px 10px", background: "#fffbeb", borderRadius: 6, fontSize: 13, color: c.warn }}>
            ⚡ Advance paid: RM{totalAdvance}
          </div>
        )}
      </div>

      <MonthPills value={month} onChange={setMonth} />

      {loading ? (
        <EmptyState icon="⏳" text="Loading..." />
      ) : payments.length === 0 ? (
        <EmptyState icon="💰" text="No payments this month" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
          {payments.map((p) => (
            <div key={p.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={p.paid_by[0]} color={p.paid_by === "Alya" ? ALYA_COLOR : NINA_COLOR} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{p.paid_by}</span>
                  <Badge label={p.note || "Payout"} color={p.note === "Advance" ? c.warn : p.note === "Bonus" ? c.success : c.accent} />
                </div>
                <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{fmtDate(p.payment_date)} · For {fmtMonth(p.for_month)}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>RM{p.amount}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Admin Salary View ─────────────────────────────────────────────────────────
function AdminSalaryView() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);

  const [formDate, setFormDate] = useState(today());
  const [formMonth, setFormMonth] = useState(currentMonth());
  const [formPaidBy, setFormPaidBy] = useState("Alya");
  const [formAmount, setFormAmount] = useState("");
  const [formNote, setFormNote] = useState("Payout");

  const showToast = useCallback((msg: string, type: "success" | "error") => setToast({ msg, type }), []);

  const load = useCallback(() => {
    setLoading(true);
    sb("GET", "salary_payments", undefined, {
      order: "payment_date.desc",
      for_month: `eq.${month}`,
    })
      .then((data) => setPayments(data || []))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setFormDate(today());
    setFormMonth(month);
    setFormPaidBy("Alya");
    setFormAmount("");
    setFormNote("Payout");
    setShowForm(true);
  }

  function openEdit(p: Payment) {
    setEditing(p);
    setFormDate(p.payment_date);
    setFormMonth(p.for_month);
    setFormPaidBy(p.paid_by);
    setFormAmount(String(p.amount));
    setFormNote(p.note || "Payout");
    setShowForm(true);
  }

  async function save() {
    const amt = parseFloat(formAmount);
    if (!formDate || !formMonth || !formPaidBy || isNaN(amt) || amt <= 0) {
      showToast("Please fill in all fields correctly", "error");
      return;
    }
    const allowed = ["Payout", "Advance", "Borrow", "Bonus"];
    if (!allowed.includes(formNote)) { showToast("Invalid type", "error"); return; }
    if (!["Alya", "Nina"].includes(formPaidBy)) { showToast("Invalid payer", "error"); return; }
    try {
      if (editing) {
        await sb("PATCH", `salary_payments?id=eq.${editing.id}`, {
          payment_date: formDate, for_month: formMonth,
          paid_by: formPaidBy, amount: amt, note: formNote,
        });
      } else {
        await sb("POST", "salary_payments", {
          payment_date: formDate, for_month: formMonth,
          paid_by: formPaidBy, amount: amt, note: formNote,
        });
      }
      showToast(editing ? "Updated" : "Payment added", "success");
      setShowForm(false);
      load();
    } catch {
      showToast("Failed to save", "error");
    }
  }

  async function del() {
    if (!confirm) return;
    try {
      await sb("DELETE", `salary_payments?id=eq.${confirm}`);
      showToast("Deleted", "success");
      setConfirm(null);
      load();
    } catch {
      showToast("Failed to delete", "error");
    }
  }

  const alyaPaid = payments.filter((p) => p.paid_by === "Alya").reduce((s, p) => s + p.amount, 0);
  const ninaPaid = payments.filter((p) => p.paid_by === "Nina").reduce((s, p) => s + p.amount, 0);
  const total = alyaPaid + ninaPaid;

  return (
    <div style={{ padding: "0 0 40px" }}>
      {/* Dashboard */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: c.muted, fontWeight: 600, marginBottom: 4 }}>TOTAL PAID — {fmtMonth(month)}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: c.text, marginBottom: 8 }}>RM{total} <span style={{ fontSize: 14, color: c.muted, fontWeight: 400 }}>/ RM{MONTHLY_SALARY}</span></div>
        <ProgressBar value={total} max={MONTHLY_SALARY} color={total >= MONTHLY_SALARY ? c.success : c.accent} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ ...card, background: ALYA_BG, border: `1px solid ${ALYA_BORDER}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: ALYA_COLOR, marginBottom: 4 }}>ALYA</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: c.text }}>RM{alyaPaid}</div>
          <ProgressBar value={alyaPaid} max={ALYA_SHARE} color={ALYA_COLOR} />
          <div style={{ fontSize: 12, color: c.muted, marginTop: 6 }}>of RM{ALYA_SHARE}</div>
        </div>
        <div style={{ ...card, background: NINA_BG, border: `1px solid ${NINA_BORDER}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: NINA_COLOR, marginBottom: 4 }}>NINA</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: c.text }}>RM{ninaPaid}</div>
          <ProgressBar value={ninaPaid} max={NINA_SHARE} color={NINA_COLOR} />
          <div style={{ fontSize: 12, color: c.muted, marginTop: 6 }}>of RM{NINA_SHARE}</div>
        </div>
      </div>

      <MonthPills value={month} onChange={setMonth} />

      <Btn onClick={openAdd} style={{ marginBottom: 16, width: "100%" }}>+ Add Payment</Btn>

      {showForm && (
        <div style={{ ...card, marginBottom: 16, background: c.subtle }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>{editing ? "Edit Payment" : "Add Payment"}</h3>

          <div style={{ marginBottom: 12 }}>
            <Lbl>Payment Date</Lbl>
            <CalendarPicker value={formDate} onChange={setFormDate} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <Lbl>For Month</Lbl>
            <CalendarPicker value={formMonth} onChange={setFormMonth} monthMode />
          </div>

          <div style={{ marginBottom: 12 }}>
            <Lbl>Paid By</Lbl>
            <div style={{ position: "relative" }}>
              <select value={formPaidBy} onChange={(e) => setFormPaidBy(e.target.value)} style={sel}>
                <option value="Alya">Alya</option>
                <option value="Nina">Nina</option>
              </select>
              <SelectArrow />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <Lbl>Amount (RM)</Lbl>
            <input
              type="number" min="0" value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="e.g. 750" style={{ ...inp, background: "#ffffff" }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <Lbl>Type</Lbl>
            <div style={{ position: "relative" }}>
              <select value={formNote} onChange={(e) => setFormNote(e.target.value)} style={sel}>
                {NOTE_OPTIONS.map((n) => <option key={n}>{n}</option>)}
              </select>
              <SelectArrow />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={save}>Save</Btn>
            <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      {loading ? (
        <EmptyState icon="⏳" text="Loading..." />
      ) : payments.length === 0 ? (
        <EmptyState icon="💰" text="No payments this month" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
          {payments.map((p) => (
            <div key={p.id} style={{
              ...card,
              background: p.paid_by === "Alya" ? ALYA_BG : NINA_BG,
              border: `1px solid ${p.paid_by === "Alya" ? ALYA_BORDER : NINA_BORDER}`,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <Avatar name={p.paid_by[0]} color={p.paid_by === "Alya" ? ALYA_COLOR : NINA_COLOR} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{p.paid_by}</span>
                  <Badge label={p.note || "Payout"} color={p.note === "Advance" ? c.warn : p.note === "Bonus" ? c.success : p.paid_by === "Alya" ? ALYA_COLOR : NINA_COLOR} />
                </div>
                <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{fmtDate(p.payment_date)} · For {fmtMonth(p.for_month)}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, marginRight: 4 }}>RM{p.amount}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn size="sm" variant="secondary" onClick={() => openEdit(p)}>Edit</Btn>
                <Btn size="sm" variant="danger" onClick={() => setConfirm(p.id)}>Del</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirm && <ConfirmDialog msg="Delete this payment?" onConfirm={del} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [role, setRole] = useState<"admin" | "eman" | null>(null);
  const [tab, setTab] = useState<"salary" | "cleaning">("salary");

  if (!role) return <LoginScreen onLogin={(r) => setRole(r)} />;

  const isAdmin = role === "admin";

  const navTabs = [
    { id: "salary", label: "💰 Salary" },
    { id: "cleaning", label: "🧹 Cleaning" },
  ] as const;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Top bar */}
      <div style={{ background: c.surface, borderBottom: `1px solid ${c.border}`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky" as const, top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🐱</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: c.text }}>Rumah Kucen</div>
            <div style={{ fontSize: 11, color: c.muted }}>Payroll</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: c.muted, background: c.subtle, padding: "4px 10px", borderRadius: 999, border: `1px solid ${c.border}` }}>
            {isAdmin ? "👤 Admin" : `👷 ${STAFF_NAME}`}
          </span>
          <button onClick={() => setRole(null)} style={{ background: "none", border: `1px solid ${c.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer", color: c.muted }}>
            Logout
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: c.surface, borderBottom: `1px solid ${c.border}`, display: "flex" }}>
        {navTabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "12px", border: "none", borderBottom: `2px solid ${tab === t.id ? c.accent : "transparent"}`,
            background: "transparent", fontWeight: 600, fontSize: 14, cursor: "pointer",
            color: tab === t.id ? c.accent : c.muted, transition: "all 0.2s",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px" }}>
        {tab === "salary" ? (
          isAdmin ? <AdminSalaryView /> : <EmanSalaryView />
        ) : (
          <CleaningPage isAdmin={isAdmin} />
        )}
      </div>
    </div>
  );
}