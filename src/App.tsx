import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://wtouazgqnnqlxauuevxn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0b3Vhemdxbm5xbHhhdXVldnhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjQ4MDIsImV4cCI6MjA5NzcwMDgwMn0.QtWPyzA7JhEFW0k9iEKxeSi3-1iGNTgGLw1aygSOCCc";
const MONTHLY_SALARY = 1500;
const ALYA_SHARE = 750;
const NINA_SHARE = 750;
const STAFF_NAME = "Eman";
const NOTE_OPTIONS = ["Payout", "Advance", "Borrow", "Bonus"];
const ADMIN_PIN = "1234";
const MAX_ATTEMPTS = 3;
const LOCKOUT_SEC = 30;
const VACUUM_RATE = 60;
const DEEPCLEAN_RATE = 120;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const ALYA_COLOR = "#7c3aed", ALYA_BG = "#faf5ff", ALYA_BORDER = "#ede9fe";
const NINA_COLOR = "#db2777", NINA_BG = "#fdf2f8", NINA_BORDER = "#fce7f3";

const getTodayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const getTodayYM = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const ymLabel = (ym) => { const [y,m] = ym.split("-"); return `${MONTHS[parseInt(m)-1]} ${y}`; };
const getMonthOptions = () => { const opts=[],base=new Date(); for(let i=-6;i<=6;i++){const d=new Date(base.getFullYear(),base.getMonth()+i,1);opts.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);} return opts; };
const sanitize = (s) => String(s).replace(/[<>'"]/g,"").trim().slice(0,100);
const formatDate = (iso) => { const [y,m,d] = iso.split("-"); return `${d} ${MONTHS[parseInt(m)-1].slice(0,3)} ${y}`; };

function getFridayOptions() {
  const fridays = [];
  const today = new Date();
  const diff = (5 - today.getDay() + 7) % 7;
  const base = new Date(today);
  base.setDate(today.getDate() + diff);
  for (let i = -8; i <= 4; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i * 7);
    fridays.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
  }
  return fridays.sort();
}

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "return=representation",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) { const err = await res.text(); throw new Error(err); }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

const c = {
  bg: "#f9fafb", surface: "#fff", border: "#e5e7eb",
  text: "#111827", muted: "#6b7280", subtle: "#9ca3af",
  accent: "#111827", accentFg: "#fff",
  success: "#16a34a", successBg: "#f0fdf4", successBorder: "#bbf7d0",
  warnBg: "#fffbeb", warnBorder: "#fde68a",
  danger: "#dc2626", dangerBg: "#fff1f2", dangerBorder: "#fecdd3",
};

const card = { background: c.surface, borderRadius: 12, border: `1px solid ${c.border}`, padding: "16px 18px" };
const inp = { width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${c.border}`, fontSize: 14, color: c.text, background: c.surface, boxSizing: "border-box", outline: "none", fontFamily: "inherit" };
const sel = { width: "100%", padding: "9px 32px 9px 12px", borderRadius: 8, border: `1px solid ${c.border}`, fontSize: 14, color: c.text, background: c.surface, boxSizing: "border-box", outline: "none", appearance: "none", fontFamily: "inherit" };

function Lbl({ children }) {
  return <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: c.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>{children}</label>;
}

function ProgressBar({ pct, color }) {
  return (
    <div style={{ background: "#f3f4f6", borderRadius: 999, height: 5 }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color || c.accent, height: 5, borderRadius: 999, transition: "width 0.4s" }} />
    </div>
  );
}

function Badge({ children, color, bg }) {
  return <span style={{ fontSize: 11, fontWeight: 600, color: color || c.muted, background: bg || "#f3f4f6", borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>{children}</span>;
}

function Btn({ children, onClick, disabled, variant, size, style: sx }) {
  const pad = size === "sm" ? "5px 12px" : "9px 16px";
  const fs = size === "sm" ? 12 : 14;
  const variants = {
    primary:   { background: c.accent,    color: c.accentFg, border: "none" },
    secondary: { background: "#f3f4f6",   color: c.text,     border: "none" },
    outline:   { background: "transparent", color: c.text,   border: `1px solid ${c.border}` },
    danger:    { background: c.dangerBg,  color: c.danger,   border: `1px solid ${c.dangerBorder}` },
    ghost:     { background: "transparent", color: c.muted,  border: "none" },
  };
  const v = variants[variant] || variants.primary;
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: pad, fontSize: fs, borderRadius: 8, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1, fontFamily: "inherit", ...v, ...sx }}>
      {children}
    </button>
  );
}

function Avatar({ name, size }) {
  const sz = size || 32;
  return (
    <div style={{ width: sz, height: sz, borderRadius: 999, background: c.accent, color: c.accentFg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: sz * 0.38, fontWeight: 700, flexShrink: 0 }}>
      {name[0].toUpperCase()}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{ ...card, textAlign: "center", padding: "36px 20px" }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
      <p style={{ margin: 0, fontSize: 14, color: c.subtle }}>{message}</p>
    </div>
  );
}

function Toast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: c.accent, color: c.accentFg, borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
      {message}
    </div>
  );
}

function ConfirmDialog({ trigger, title, description, onConfirm }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ ...card, maxWidth: 340, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
            <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: c.text }}>{title}</p>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: c.muted }}>{description}</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn variant="outline" onClick={() => setOpen(false)}>Cancel</Btn>
              <Btn variant="danger" onClick={() => { onConfirm(); setOpen(false); }}>Delete</Btn>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MonthPills({ months, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {months.map(ym => (
        <button key={ym} onClick={() => onChange(ym)} style={{ padding: "5px 14px", borderRadius: 999, border: `1.5px solid ${value === ym ? c.accent : c.border}`, background: value === ym ? c.accent : c.surface, color: value === ym ? c.accentFg : c.muted, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
          {ymLabel(ym)}
        </button>
      ))}
    </div>
  );
}

function SelectArrow({ value, onChange, children }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={onChange} style={sel}>{children}</select>
      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: c.muted }}>▾</span>
    </div>
  );
}

function DateInput({ defaultValue, onChange }) {
  return (
    <input
      type="date"
      defaultValue={defaultValue}
      onChange={e => onChange(e.target.value)}
      style={inp}
    />
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => {
      const rem = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (rem <= 0) { setLockedUntil(null); setAttempts(0); setCountdown(0); }
      else setCountdown(rem);
    }, 500);
    return () => clearInterval(id);
  }, [lockedUntil]);

  function handleSubmit() {
    if (lockedUntil) return;
    if (pin === ADMIN_PIN) {
      onLogin("Admin");
    } else {
      const next = attempts + 1;
      setAttempts(next);
      setPin("");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      if (next >= MAX_ATTEMPTS) setLockedUntil(Date.now() + LOCKOUT_SEC * 1000);
    }
  }

  const isLocked = !!lockedUntil;

  return (
    <div style={{ minHeight: "100vh", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter','Segoe UI',sans-serif", padding: 20 }}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}`}</style>
      <div style={{ width: "100%", maxWidth: 340 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, background: c.accent, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 14px" }}>🐱</div>
          <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: c.text }}>Rumah Kucen Payroll</h1>
          <p style={{ margin: 0, fontSize: 13, color: c.subtle }}>Staff salary management</p>
        </div>
        <div style={card}>
          {!showPin ? (
            <>
              <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 600, color: c.muted, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.05em" }}>Select account</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[{ name: "Admin", role: "Full access" }, { name: "Eman", role: "Staff · View only" }].map(({ name, role }) => (
                  <button key={name} onClick={() => { if (name === "Eman") { onLogin("Eman"); } else { setShowPin(true); setPin(""); setAttempts(0); setLockedUntil(null); } }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.surface, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                    <Avatar name={name} size={36} />
                    <div>
                      <p style={{ margin: "0 0 1px", fontSize: 14, fontWeight: 600, color: c.text }}>{name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: c.subtle }}>{role}</p>
                    </div>
                    <span style={{ marginLeft: "auto", color: c.subtle, fontSize: 18 }}>›</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <Avatar name="A" size={36} />
                <div>
                  <p style={{ margin: "0 0 1px", fontSize: 14, fontWeight: 600, color: c.text }}>Admin</p>
                  <p style={{ margin: 0, fontSize: 11, color: c.subtle }}>Enter 4-digit PIN</p>
                </div>
              </div>
              {isLocked ? (
                <div style={{ background: c.dangerBg, border: `1px solid ${c.dangerBorder}`, borderRadius: 8, padding: "12px", textAlign: "center", marginBottom: 14 }}>
                  <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: c.danger }}>Too many attempts</p>
                  <p style={{ margin: 0, fontSize: 12, color: c.danger }}>Try again in {countdown}s</p>
                </div>
              ) : (
                <>
                  <input type="password" inputMode="numeric" maxLength={4} value={pin} autoFocus
                    onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={e => e.key === "Enter" && pin.length === 4 && handleSubmit()}
                    placeholder="• • • •"
                    style={{ ...inp, textAlign: "center", fontSize: 26, letterSpacing: 14, marginBottom: 8, animation: shake ? "shake 0.4s" : "none" }} />
                  {attempts > 0 && (
                    <p style={{ margin: "0 0 10px", fontSize: 12, color: c.danger, textAlign: "center" }}>
                      Incorrect — {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? "s" : ""} left
                    </p>
                  )}
                </>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="outline" onClick={() => setShowPin(false)} style={{ flex: 1 }}>Back</Btn>
                <Btn onClick={handleSubmit} disabled={pin.length < 4 || isLocked} style={{ flex: 1 }}>Enter</Btn>
              </div>
            </>
          )}
        </div>
        <p style={{ textAlign: "center", fontSize: 11, color: c.subtle, marginTop: 16 }}>Rumah Kucen © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}

// ── CLEANING PAGE ─────────────────────────────────────────────────────────────
function CleaningPage({ isAdmin }) {
  const todayYM = getTodayYM();
  const todayISO = getTodayISO();
  const fridayOptions = getFridayOptions();
  const monthOptions = getMonthOptions();

  const [vacuums, setVacuums] = useState([]);
  const [deepCleans, setDeepCleans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [viewMonth, setViewMonth] = useState(todayYM);
  const [showVacuumForm, setShowVacuumForm] = useState(false);
  const [showDeepForm, setShowDeepForm] = useState(false);
  const [editVacuumId, setEditVacuumId] = useState(null);
  const [editDeepId, setEditDeepId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [vacuumForm, setVacuumForm] = useState({ friday_date: fridayOptions[fridayOptions.length - 5] || todayISO, paid_date: todayISO, paid: false });
  const [deepForm, setDeepForm] = useState({ for_month: todayYM, paid_date: todayISO, paid: false });
  const [formKey, setFormKey] = useState(0);

  const fetchAll = useCallback(async () => {
    try {
      const [v, d] = await Promise.all([
        sbFetch("cleaning_vacuum?order=friday_date.desc"),
        sbFetch("cleaning_deepclean?order=for_month.desc"),
      ]);
      setVacuums(v); setDeepCleans(d);
    } catch (e) { setToast("Failed to load cleaning data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { const id = setInterval(fetchAll, 10000); return () => clearInterval(id); }, [fetchAll]);

  const allMonths = Array.from(new Set([todayYM, ...vacuums.map(v => v.friday_date.slice(0,7)), ...deepCleans.map(d => d.for_month)])).sort().reverse();
  const monthVacuums = vacuums.filter(v => v.friday_date.slice(0,7) === viewMonth).sort((a,b) => b.friday_date.localeCompare(a.friday_date));
  const monthDeepCleans = deepCleans.filter(d => d.for_month === viewMonth);
  const vacuumPaid = monthVacuums.filter(v => v.paid).length;
  const vacuumTotal = monthVacuums.length;

  async function saveVacuum() {
    setSaving(true);
    try {
      const payload = { friday_date: sanitize(vacuumForm.friday_date), paid_date: vacuumForm.paid ? sanitize(vacuumForm.paid_date) : null, paid: vacuumForm.paid };
      if (editVacuumId) await sbFetch(`cleaning_vacuum?id=eq.${editVacuumId}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await sbFetch("cleaning_vacuum", { method: "POST", body: JSON.stringify(payload) });
      await fetchAll();
      setShowVacuumForm(false); setEditVacuumId(null);
      setToast(editVacuumId ? "Vacuum updated ✓" : "Vacuum added ✓");
    } catch (e) { setToast("Failed to save"); }
    finally { setSaving(false); }
  }

  async function saveDeep() {
    setSaving(true);
    try {
      const payload = { for_month: sanitize(deepForm.for_month), paid_date: deepForm.paid ? sanitize(deepForm.paid_date) : null, paid: deepForm.paid };
      if (editDeepId) await sbFetch(`cleaning_deepclean?id=eq.${editDeepId}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await sbFetch("cleaning_deepclean", { method: "POST", body: JSON.stringify(payload) });
      await fetchAll();
      setShowDeepForm(false); setEditDeepId(null);
      setToast(editDeepId ? "Deep clean updated ✓" : "Deep clean added ✓");
    } catch (e) { setToast("Failed to save"); }
    finally { setSaving(false); }
  }

  async function deleteVacuum(id) {
    setDeleting(id);
    try { await sbFetch(`cleaning_vacuum?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }); await fetchAll(); setToast("Entry deleted"); }
    catch (e) { setToast("Failed to delete"); } finally { setDeleting(null); }
  }

  async function deleteDeep(id) {
    setDeleting(id);
    try { await sbFetch(`cleaning_deepclean?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }); await fetchAll(); setToast("Entry deleted"); }
    catch (e) { setToast("Failed to delete"); } finally { setDeleting(null); }
  }

  function openAddVacuum() {
    setVacuumForm({ friday_date: fridayOptions[fridayOptions.length - 5] || todayISO, paid_date: todayISO, paid: false });
    setEditVacuumId(null); setShowDeepForm(false); setFormKey(k => k + 1); setShowVacuumForm(true);
  }

  function openEditVacuum(entry) {
    setVacuumForm({ friday_date: entry.friday_date, paid_date: entry.paid_date || todayISO, paid: !!entry.paid });
    setEditVacuumId(entry.id); setShowDeepForm(false); setFormKey(k => k + 1); setShowVacuumForm(true);
  }

  function openAddDeep() {
    setDeepForm({ for_month: todayYM, paid_date: todayISO, paid: false });
    setEditDeepId(null); setShowVacuumForm(false); setFormKey(k => k + 1); setShowDeepForm(true);
  }

  function openEditDeep(entry) {
    setDeepForm({ for_month: entry.for_month, paid_date: entry.paid_date || todayISO, paid: !!entry.paid });
    setEditDeepId(entry.id); setShowVacuumForm(false); setFormKey(k => k + 1); setShowDeepForm(true);
  }

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: c.subtle }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px 60px" }}>
      <div style={{ marginBottom: 20 }}>
        <Lbl>Month</Lbl>
        <MonthPills months={allMonths} value={viewMonth} onChange={setViewMonth} />
      </div>

      {/* VACUUM */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: c.text }}>🧹 Weekly Vacuum</p>
            <p style={{ margin: 0, fontSize: 12, color: c.subtle }}>RM{VACUUM_RATE} per Friday</p>
          </div>
          {isAdmin && !showVacuumForm && <Btn size="sm" onClick={openAddVacuum}>+ Add</Btn>}
        </div>

        {vacuumTotal > 0 && (
          <div style={{ ...card, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: c.muted, fontWeight: 600 }}>{ymLabel(viewMonth)}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>RM{vacuumPaid * VACUUM_RATE} <span style={{ fontSize: 12, color: c.subtle, fontWeight: 400 }}>/ RM{vacuumTotal * VACUUM_RATE}</span></span>
            </div>
            <ProgressBar pct={vacuumTotal ? (vacuumPaid / vacuumTotal) * 100 : 0} color={vacuumPaid === vacuumTotal ? c.success : c.accent} />
            <p style={{ margin: "6px 0 0", fontSize: 12, color: vacuumPaid === vacuumTotal ? c.success : c.muted, fontWeight: 600 }}>
              {vacuumPaid === vacuumTotal ? `✓ All ${vacuumTotal} sessions paid` : `${vacuumPaid} of ${vacuumTotal} sessions paid`}
            </p>
          </div>
        )}

        {showVacuumForm && isAdmin && (
          <div style={{ ...card, marginBottom: 10, borderColor: c.accent }}>
            <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: c.text }}>{editVacuumId ? "Edit Vacuum Entry" : "New Vacuum Entry"}</p>
            <div style={{ marginBottom: 10 }}>
              <Lbl>Friday Date</Lbl>
              <SelectArrow value={vacuumForm.friday_date} onChange={e => setVacuumForm(f => ({ ...f, friday_date: e.target.value }))}>
                {Array.from(new Set([...fridayOptions, vacuumForm.friday_date])).sort().map(d => (
                  <option key={d} value={d}>{formatDate(d)}</option>
                ))}
              </SelectArrow>
            </div>
            <div style={{ marginBottom: 10 }}>
              <Lbl>Payment Date</Lbl>
              <DateInput key={`v-${formKey}`} defaultValue={vacuumForm.paid_date} onChange={v => setVacuumForm(f => ({ ...f, paid_date: v }))} />
              {vacuumForm.paid_date && vacuumForm.paid_date < vacuumForm.friday_date && (
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#d97706" }}>⚡ Advance — paid before the Friday session</p>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 12px", background: "#f9fafb", borderRadius: 8, border: `1px solid ${c.border}` }}>
              <input type="checkbox" id="vpaid" checked={vacuumForm.paid} onChange={e => setVacuumForm(f => ({ ...f, paid: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer" }} />
              <label htmlFor="vpaid" style={{ fontSize: 14, color: c.text, fontWeight: 600, cursor: "pointer" }}>Mark as paid</label>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={saveVacuum} disabled={saving} style={{ flex: 1 }}>{saving ? "Saving…" : editVacuumId ? "Save Changes" : "Add Entry"}</Btn>
              <Btn variant="secondary" onClick={() => { setShowVacuumForm(false); setEditVacuumId(null); }}>Cancel</Btn>
            </div>
          </div>
        )}

        {monthVacuums.length === 0 ? <EmptyState message={`No vacuum entries for ${ymLabel(viewMonth)}.`} /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {monthVacuums.map(entry => {
              const adv = entry.paid && entry.paid_date && entry.paid_date < entry.friday_date;
              return (
                <div key={entry.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderLeft: `3px solid ${entry.paid ? c.success : c.border}` }}>
                  <div style={{ textAlign: "center", minWidth: 34 }}>
                    <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: c.text, lineHeight: 1 }}>{entry.friday_date.split("-")[2]}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 10, color: c.subtle }}>{MONTHS[parseInt(entry.friday_date.split("-")[1])-1].slice(0,3).toUpperCase()}</p>
                  </div>
                  <div style={{ width: 1, height: 28, background: c.border, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: c.text }}>Friday Vacuum</p>
                      {entry.paid && <Badge color={adv ? "#92400e" : c.success} bg={adv ? "#fef3c7" : c.successBg}>{adv ? "Advance" : "Paid"}</Badge>}
                      {!entry.paid && <Badge color={c.danger} bg={c.dangerBg}>Unpaid</Badge>}
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: c.subtle }}>{entry.paid && entry.paid_date ? `Paid on ${formatDate(entry.paid_date)}` : "Not yet paid"}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: c.text }}>RM{VACUUM_RATE}</p>
                    {isAdmin && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn variant="outline" size="sm" onClick={() => openEditVacuum(entry)}>Edit</Btn>
                        <ConfirmDialog trigger={<Btn variant="danger" size="sm" disabled={deleting === entry.id}>{deleting === entry.id ? "…" : "Del"}</Btn>} title="Delete entry?" description={`Remove vacuum entry for ${formatDate(entry.friday_date)}?`} onConfirm={() => deleteVacuum(entry.id)} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DEEP CLEAN */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: c.text }}>🧼 Monthly Deep Clean</p>
            <p style={{ margin: 0, fontSize: 12, color: c.subtle }}>RM{DEEPCLEAN_RATE} per month</p>
          </div>
          {isAdmin && !showDeepForm && <Btn size="sm" onClick={openAddDeep}>+ Add</Btn>}
        </div>

        {showDeepForm && isAdmin && (
          <div style={{ ...card, marginBottom: 10, borderColor: c.accent }}>
            <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: c.text }}>{editDeepId ? "Edit Deep Clean" : "New Deep Clean"}</p>
            <div style={{ marginBottom: 10 }}>
              <Lbl>For Month</Lbl>
              <SelectArrow value={deepForm.for_month} onChange={e => setDeepForm(f => ({ ...f, for_month: e.target.value }))}>
                {monthOptions.map(ym => <option key={ym} value={ym}>{ymLabel(ym)}</option>)}
              </SelectArrow>
            </div>
            <div style={{ marginBottom: 10 }}>
              <Lbl>Payment Date</Lbl>
              <DateInput key={`d-${formKey}`} defaultValue={deepForm.paid_date} onChange={v => setDeepForm(f => ({ ...f, paid_date: v }))} />
              {deepForm.paid_date && deepForm.paid_date.slice(0,7) < deepForm.for_month && (
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#d97706" }}>⚡ Advance — paid before the month</p>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 12px", background: "#f9fafb", borderRadius: 8, border: `1px solid ${c.border}` }}>
              <input type="checkbox" id="dpaid" checked={deepForm.paid} onChange={e => setDeepForm(f => ({ ...f, paid: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer" }} />
              <label htmlFor="dpaid" style={{ fontSize: 14, color: c.text, fontWeight: 600, cursor: "pointer" }}>Mark as paid</label>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={saveDeep} disabled={saving} style={{ flex: 1 }}>{saving ? "Saving…" : editDeepId ? "Save Changes" : "Add Entry"}</Btn>
              <Btn variant="secondary" onClick={() => { setShowDeepForm(false); setEditDeepId(null); }}>Cancel</Btn>
            </div>
          </div>
        )}

        {monthDeepCleans.length === 0 ? <EmptyState message={`No deep clean entry for ${ymLabel(viewMonth)}.`} /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {monthDeepCleans.map(entry => {
              const adv = entry.paid && entry.paid_date && entry.paid_date.slice(0,7) < entry.for_month;
              return (
                <div key={entry.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderLeft: `3px solid ${entry.paid ? c.success : c.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: c.text }}>Deep Clean · {ymLabel(entry.for_month)}</p>
                      {entry.paid && <Badge color={adv ? "#92400e" : c.success} bg={adv ? "#fef3c7" : c.successBg}>{adv ? "Advance" : "Paid"}</Badge>}
                      {!entry.paid && <Badge color={c.danger} bg={c.dangerBg}>Unpaid</Badge>}
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: c.subtle }}>{entry.paid && entry.paid_date ? `Paid on ${formatDate(entry.paid_date)}` : "Not yet paid"}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: c.text }}>RM{DEEPCLEAN_RATE}</p>
                    {isAdmin && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn variant="outline" size="sm" onClick={() => openEditDeep(entry)}>Edit</Btn>
                        <ConfirmDialog trigger={<Btn variant="danger" size="sm" disabled={deleting === entry.id}>{deleting === entry.id ? "…" : "Del"}</Btn>} title="Delete entry?" description={`Remove deep clean for ${ymLabel(entry.for_month)}?`} onConfirm={() => deleteDeep(entry.id)} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// ── EMAN SALARY VIEW ──────────────────────────────────────────────────────────
function EmanSalaryView({ payments }) {
  const todayYM = getTodayYM();
  const [viewMonth, setViewMonth] = useState(todayYM);
  const [sortAsc, setSortAsc] = useState(false);
  const allMonths = Array.from(new Set([todayYM, ...payments.map(p => p.for_month)])).sort().reverse();
  const monthPayments = payments.filter(p => p.for_month === viewMonth).sort((a,b) => sortAsc ? a.payment_date.localeCompare(b.payment_date) : b.payment_date.localeCompare(a.payment_date));
  const totalPaid = monthPayments.reduce((s,p) => s + parseFloat(p.amount), 0);
  const totalAdvance = monthPayments.filter(p => p.payment_date.slice(0,7) < p.for_month).reduce((s,p) => s + parseFloat(p.amount), 0);
  const remaining = Math.max(0, MONTHLY_SALARY - totalPaid);
  const fullyPaid = remaining === 0;
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px 60px" }}>
      <div style={{ marginBottom: 20 }}><Lbl>Payroll Month</Lbl><MonthPills months={allMonths} value={viewMonth} onChange={setViewMonth} /></div>
      <div style={{ ...card, background: fullyPaid ? c.successBg : c.surface, borderColor: fullyPaid ? c.successBorder : c.border, marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: fullyPaid ? c.success : c.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{fullyPaid ? "Status" : "Remaining"}</p>
            <p style={{ margin: 0, fontSize: 34, fontWeight: 800, color: fullyPaid ? c.success : c.text, letterSpacing: -1 }}>{fullyPaid ? "Fully paid ✓" : `RM ${remaining.toFixed(0)}`}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 600, color: c.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Received</p>
            <p style={{ margin: "0 0 1px", fontSize: 20, fontWeight: 700, color: c.text }}>RM {totalPaid.toFixed(0)}</p>
            <p style={{ margin: 0, fontSize: 12, color: c.subtle }}>of RM {MONTHLY_SALARY}</p>
          </div>
        </div>
        <ProgressBar pct={(totalPaid / MONTHLY_SALARY) * 100} color={fullyPaid ? c.success : c.accent} />
      </div>
      {totalAdvance > 0 && (
        <div style={{ ...card, background: c.warnBg, borderColor: c.warnBorder, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 600, color: "#d97706", textTransform: "uppercase" }}>⚡ Advance taken</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#78350f" }}>RM {totalAdvance.toFixed(0)}</p>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#92400e", maxWidth: 130, textAlign: "right" }}>Applied to {ymLabel(viewMonth)}</p>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 0 10px" }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: c.text }}>Payment History</p>
        <Btn variant="outline" size="sm" onClick={() => setSortAsc(v => !v)}>{sortAsc ? "↑ Oldest" : "↓ Newest"}</Btn>
      </div>
      {monthPayments.length === 0 ? <EmptyState message={`No payments for ${ymLabel(viewMonth)} yet.`} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {monthPayments.map(entry => {
            const isAlya = entry.paid_by === "Alya", adv = entry.payment_date.slice(0,7) < entry.for_month;
            const nameColor = isAlya ? ALYA_COLOR : NINA_COLOR, badgeBg = isAlya ? ALYA_BORDER : NINA_BORDER;
            const [,pm,pd] = entry.payment_date.split("-");
            return (
              <div key={entry.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
                <div style={{ textAlign: "center", minWidth: 34 }}><p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: c.text, lineHeight: 1 }}>{pd}</p><p style={{ margin: "2px 0 0", fontSize: 10, color: c.subtle }}>{MONTHS[parseInt(pm)-1].slice(0,3).toUpperCase()}</p></div>
                <div style={{ width: 1, height: 28, background: isAlya ? ALYA_BORDER : NINA_BORDER, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: nameColor }}>{entry.paid_by}</p>
                    {entry.note && <Badge color={adv ? "#92400e" : nameColor} bg={adv ? "#fef3c7" : badgeBg}>{entry.note}</Badge>}
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: c.subtle }}>for {ymLabel(entry.for_month)}</p>
                </div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: c.text }}>RM {parseFloat(entry.amount).toFixed(0)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── ADMIN SALARY VIEW ─────────────────────────────────────────────────────────
function AdminSalaryView({ payments, fetchPayments }) {
  const todayISO = getTodayISO(), todayYM = getTodayYM();
  const [viewMonth, setViewMonth] = useState(todayYM);
  const [sortAsc, setSortAsc] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({ payment_date: todayISO, for_month: todayYM, paid_by: "Alya", amount: "", note: "Payout" });

  const allMonths = Array.from(new Set([todayYM, ...payments.map(p => p.for_month)])).sort().reverse();
  const monthOptions = getMonthOptions();
  const monthPayments = payments.filter(p => p.for_month === viewMonth).sort((a,b) => sortAsc ? a.payment_date.localeCompare(b.payment_date) : b.payment_date.localeCompare(a.payment_date));
  const alyaPaid = monthPayments.filter(p => p.paid_by === "Alya").reduce((s,p) => s + parseFloat(p.amount), 0);
  const ninaPaid = monthPayments.filter(p => p.paid_by === "Nina").reduce((s,p) => s + parseFloat(p.amount), 0);
  const totalPaid = alyaPaid + ninaPaid, totalRemaining = MONTHLY_SALARY - totalPaid;

  function validate() {
    const e = {};
    if (!form.payment_date) e.payment_date = "Required";
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) e.amount = "Enter a valid amount";
    else if (amt > MONTHLY_SALARY) e.amount = `Max RM${MONTHLY_SALARY}`;
    return e;
  }

  function openAdd() {
    setEditId(null); setForm({ payment_date: todayISO, for_month: viewMonth, paid_by: "Alya", amount: "", note: "Payout" }); setErrors({}); setShowForm(true);
  }

  function openEdit(entry) {
    setShowForm(false); setEditId(null);
    setTimeout(() => { setEditId(entry.id); setForm({ payment_date: entry.payment_date, for_month: entry.for_month, paid_by: entry.paid_by, amount: String(entry.amount), note: entry.note || "Payout" }); setErrors({}); setShowForm(true); }, 0);
  }

  async function handleSave() {
    const e = validate(); if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const payload = { payment_date: sanitize(form.payment_date), for_month: sanitize(form.for_month), paid_by: ["Alya","Nina"].includes(form.paid_by) ? form.paid_by : "Alya", amount: parseFloat(form.amount), note: NOTE_OPTIONS.includes(form.note) ? form.note : "Payout" };
      if (editId) await sbFetch(`salary_payments?id=eq.${editId}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await sbFetch("salary_payments", { method: "POST", body: JSON.stringify(payload) });
      await fetchPayments(); setViewMonth(form.for_month); setShowForm(false); setEditId(null);
      setToast(editId ? "Payment updated ✓" : "Payment recorded ✓");
    } catch (err) { setToast("Failed to save."); } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try { await sbFetch(`salary_payments?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }); await fetchPayments(); setToast("Payment deleted"); }
    catch (err) { setToast("Failed to delete."); } finally { setDeleting(null); }
  }

  const isAdvance = form.payment_date && form.for_month && form.payment_date.slice(0,7) < form.for_month;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px 60px" }}>
      <div style={{ marginBottom: 20 }}><Lbl>Payroll Month</Lbl><MonthPills months={allMonths} value={viewMonth} onChange={setViewMonth} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        {[{ name: "Alya", paid: alyaPaid, share: ALYA_SHARE, color: ALYA_COLOR, bg: ALYA_BG, border: ALYA_BORDER }, { name: "Nina", paid: ninaPaid, share: NINA_SHARE, color: NINA_COLOR, bg: NINA_BG, border: NINA_BORDER }].map(({ name, paid, share, color, bg, border }) => {
          const rem = Math.max(0, share - paid);
          return (
            <div key={name} style={{ ...card, background: bg, borderColor: border }}>
              <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{name}</p>
              <p style={{ margin: "0 0 1px", fontSize: 22, fontWeight: 800, color: c.text }}>RM{paid.toFixed(0)}</p>
              <p style={{ margin: "0 0 8px", fontSize: 11, color: c.subtle }}>of RM{share}</p>
              <ProgressBar pct={(paid/share)*100} color={rem === 0 ? c.success : color} />
              <p style={{ margin: "6px 0 0", fontSize: 12, fontWeight: 600, color: rem === 0 ? c.success : color }}>{rem === 0 ? "✓ Settled" : `RM${rem} outstanding`}</p>
            </div>
          );
        })}
      </div>
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: c.muted }}>{ymLabel(viewMonth)}</p>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: c.text }}>RM{totalPaid} <span style={{ fontSize: 12, color: c.subtle, fontWeight: 400 }}>/ RM{MONTHLY_SALARY}</span></p>
        </div>
        <ProgressBar pct={(totalPaid/MONTHLY_SALARY)*100} color={totalRemaining <= 0 ? c.success : c.accent} />
        <p style={{ margin: "8px 0 0", fontSize: 12, fontWeight: 600, color: totalRemaining <= 0 ? c.success : c.muted }}>{totalRemaining <= 0 ? `✓ ${STAFF_NAME} fully paid` : `RM${totalRemaining} still to pay`}</p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: c.text }}>Payment Log</p>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="outline" size="sm" onClick={() => setSortAsc(v => !v)}>{sortAsc ? "↑ Oldest" : "↓ Newest"}</Btn>
          {!showForm && <Btn size="sm" onClick={openAdd}>+ Add</Btn>}
        </div>
      </div>
      {showForm && (
        <div style={{ ...card, marginBottom: 12, borderColor: c.accent }}>
          <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: c.text }}>{editId ? "Edit Payment" : "New Payment"}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <Lbl>Payment Date</Lbl>
              <input type="date" value={form.payment_date} onChange={e => { setForm(f => ({ ...f, payment_date: e.target.value })); setErrors(v => ({ ...v, payment_date: null })); }} style={{ ...inp, borderColor: errors.payment_date ? c.danger : c.border }} />
              {errors.payment_date && <p style={{ margin: "4px 0 0", fontSize: 11, color: c.danger }}>{errors.payment_date}</p>}
            </div>
            <div>
              <Lbl>For Month</Lbl>
              <SelectArrow value={form.for_month} onChange={e => setForm(f => ({ ...f, for_month: e.target.value }))}>
                {monthOptions.map(ym => <option key={ym} value={ym}>{ymLabel(ym)}</option>)}
              </SelectArrow>
            </div>
          </div>
          {isAdvance && <div style={{ background: c.warnBg, border: `1px solid ${c.warnBorder}`, borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 12, color: "#92400e" }}>⚡ Recording as <strong>advance</strong> toward {ymLabel(form.for_month)}.</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <Lbl>Paid by</Lbl>
              <SelectArrow value={form.paid_by} onChange={e => setForm(f => ({ ...f, paid_by: e.target.value }))}>
                <option value="Alya">Alya</option>
                <option value="Nina">Nina</option>
              </SelectArrow>
            </div>
            <div>
              <Lbl>Amount (RM)</Lbl>
              <input type="number" min="1" max={MONTHLY_SALARY} placeholder="0.00" value={form.amount} onChange={e => { setForm(f => ({ ...f, amount: e.target.value })); setErrors(v => ({ ...v, amount: null })); }} style={{ ...inp, borderColor: errors.amount ? c.danger : c.border }} />
              {errors.amount && <p style={{ margin: "4px 0 0", fontSize: 11, color: c.danger }}>{errors.amount}</p>}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <Lbl>Type</Lbl>
            <SelectArrow value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}>
              {NOTE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </SelectArrow>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={handleSave} disabled={saving} style={{ flex: 1 }}>{saving ? "Saving…" : editId ? "Save Changes" : "Record Payment"}</Btn>
            <Btn variant="secondary" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Btn>
          </div>
        </div>
      )}
      {monthPayments.length === 0 ? <EmptyState message={`No payments for ${ymLabel(viewMonth)} yet.`} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {monthPayments.map(entry => {
            const isAlya = entry.paid_by === "Alya", adv = entry.payment_date.slice(0,7) < entry.for_month;
            const nameColor = isAlya ? ALYA_COLOR : NINA_COLOR, badgeBg = isAlya ? ALYA_BORDER : NINA_BORDER;
            const [,pm,pd] = entry.payment_date.split("-");
            return (
              <div key={entry.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
                <div style={{ textAlign: "center", minWidth: 34 }}><p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: c.text, lineHeight: 1 }}>{pd}</p><p style={{ margin: "2px 0 0", fontSize: 10, color: c.subtle }}>{MONTHS[parseInt(pm)-1].slice(0,3).toUpperCase()}</p></div>
                <div style={{ width: 1, height: 28, background: isAlya ? ALYA_BORDER : NINA_BORDER, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: nameColor }}>{entry.paid_by}</p>
                    {entry.note && <Badge color={adv ? "#92400e" : nameColor} bg={adv ? "#fef3c7" : badgeBg}>{entry.note}</Badge>}
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: c.subtle }}>for {ymLabel(entry.for_month)}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: c.text }}>RM{parseFloat(entry.amount).toFixed(0)}</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="outline" size="sm" onClick={() => openEdit(entry)}>Edit</Btn>
                    <ConfirmDialog trigger={<Btn variant="danger" size="sm" disabled={deleting === entry.id}>{deleting === entry.id ? "…" : "Del"}</Btn>} title="Delete payment?" description={`Remove RM${parseFloat(entry.amount).toFixed(0)} paid by ${entry.paid_by}?`} onConfirm={() => handleDelete(entry.id)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("salary");
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPayments = useCallback(async () => {
    try { const data = await sbFetch("salary_payments?order=payment_date.asc"); setPayments(data); setError(null); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);
  useEffect(() => { const id = setInterval(fetchPayments, 10000); return () => clearInterval(id); }, [fetchPayments]);

  if (!user) return <LoginScreen onLogin={u => { setUser(u); setTab("salary"); }} />;

  if (loading) return <div style={{ minHeight: "100vh", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif" }}><p style={{ color: c.subtle, fontSize: 14 }}>Loading…</p></div>;

  if (error) return (
    <div style={{ minHeight: "100vh", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif", padding: 24 }}>
      <div style={{ ...card, maxWidth: 340, width: "100%", textAlign: "center" }}>
        <p style={{ fontSize: 32, margin: "0 0 10px" }}>⚠️</p>
        <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: c.text }}>Connection failed</p>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: c.muted }}>{error}</p>
        <Btn onClick={fetchPayments}>Retry</Btn>
      </div>
    </div>
  );

  const isAdmin = user === "Admin";

  return (
    <div style={{ minHeight: "100vh", background: c.bg, fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <div style={{ background: c.surface, borderBottom: `1px solid ${c.border}`, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>🐱</span>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: c.text }}>Rumah Kucen</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#f3f4f6", borderRadius: 999, padding: "4px 12px 4px 6px" }}>
              <Avatar name={user} size={22} />
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: c.text }}>{user}</p>
            </div>
            <Btn variant="ghost" size="sm" onClick={() => setUser(null)}>Switch ↩</Btn>
          </div>
        </div>
        <div style={{ display: "flex", borderTop: `1px solid ${c.border}` }}>
          {[{ key: "salary", label: "💰 Salary" }, { key: "cleaning", label: "🧹 Cleaning" }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, padding: "11px 0", border: "none", background: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", color: tab === t.key ? c.text : c.subtle, borderBottom: `2px solid ${tab === t.key ? c.accent : "transparent"}`, fontFamily: "inherit", transition: "all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {tab === "salary"
        ? (isAdmin ? <AdminSalaryView payments={payments} fetchPayments={fetchPayments} /> : <EmanSalaryView payments={payments} />)
        : <CleaningPage isAdmin={isAdmin} />
      }
    </div>
  );
}