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
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Business constants ────────────────────────────────────────────────────────
const MONTHLY_SALARY = 1500;
const ALYA_SHARE = 750;
const NINA_SHARE = 750;
const STAFF_NAME = "Eman";
const NOTE_OPTIONS = ["Payout", "Advance", "Borrow", "Bonus"];
const ADMIN_PIN = "1234";
const VACUUM_RATE = 60;
const DEEPCLEAN_RATE = 180;

// ── Palette ───────────────────────────────────────────────────────────────────
const c = {
  plum: "#2E0B3D",
  plumMid: "#43125C",
  plumSoft: "#5B2379",
  gold: "#FFCE1F",
  goldDeep: "#E8B400",

  ink: "#271233",
  body: "#7A6A84",
  faint: "#AEA2B6",

  card: "#FFFFFF",
  line: "#F0EBF4",

  mint: "#D8F5EA",
  mintInk: "#0E9D73",
  blush: "#FCDAEA",
  blushInk: "#D43F7C",
  lilac: "#EADDFC",
  lilacInk: "#7A3BE0",
  sky: "#D8EFF8",
  skyInk: "#1C93BE",
  cream: "#FFF0CC",

  alya: "#7A3BE0",
  nina: "#D43F7C",
  good: "#0E9D73",
  warn: "#E08A00",
  bad: "#E8395C",
};

const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const PAGE_BG =
  "linear-gradient(165deg, #F7F0FB 0%, #FBF4F7 40%, #FDF7EE 75%, #F8F1FB 100%)";

// Payout is the norm, so it stays neutral and the exceptions carry colour.
// It must not reuse Alya's or Nina's hue, or it reads as a person.
const NOTE_COLOR: Record<string, string> = {
  Payout: c.body,
  Advance: "#C07400",
  Borrow: c.skyInk,
  Bonus: c.mintInk,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const M_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const M_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function today() {
  return new Date().toISOString().slice(0, 10);
}
function fmtDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${parseInt(day)} ${M_SHORT[parseInt(m) - 1]} ${y}`;
}
function fmtDateShort(d: string) {
  if (!d) return "";
  const [, m, day] = d.split("-");
  return `${parseInt(day)} ${M_SHORT[parseInt(m) - 1]}`;
}
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function fmtMonth(m: string) {
  if (!m) return "";
  const [y, mo] = m.split("-");
  return `${M_SHORT[parseInt(mo) - 1]} ${y}`;
}
function fmtMonthLong(m: string) {
  if (!m) return "";
  const [y, mo] = m.split("-");
  return `${M_LONG[parseInt(mo) - 1]} ${y}`;
}
function rm(n: number) {
  return `RM ${n.toLocaleString("en-MY")}`;
}

function getFridayOptions(existing: string[] = [], editing: string | null = null) {
  const out: string[] = [];
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 28);
  while (start.getDay() !== 5) start.setDate(start.getDate() + 1);
  const end = new Date(now);
  end.setDate(now.getDate() + 84);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 7)) {
    const s = d.toISOString().slice(0, 10);
    if (!existing.includes(s) || s === editing) out.push(s);
  }
  return out;
}

function getDeepCleanMonthOptions(existing: string[] = [], editing: string | null = null) {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!existing.includes(s) || s === editing) out.push(s);
  }
  return out;
}

// ── Shared style objects ──────────────────────────────────────────────────────
const num: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: '"tnum"',
};

const card: React.CSSProperties = {
  background: c.card,
  borderRadius: 20,
  boxShadow: "0 2px 14px rgba(46,11,61,0.05)",
};

const inp: React.CSSProperties = {
  width: "100%",
  padding: "13px 15px",
  border: "none",
  borderRadius: 14,
  fontSize: 15,
  fontFamily: FONT,
  background: "#F6F2F9",
  color: c.ink,
  outline: "none",
  boxSizing: "border-box",
};

// ── Icons (geometric line glyphs, drawn inline) ───────────────────────────────
function svgProps(size: number, color: string, w = 1.9) {
  return {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: color, strokeWidth: w,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}
function IconWallet({ size = 23, color = "#fff" }) {
  return (
    <svg {...svgProps(size, color)}>
      <path d="M3.5 8.5A2.5 2.5 0 016 6h10.5" />
      <rect x="3.5" y="8.5" width="17" height="11" rx="3.2" />
      <circle cx="16.4" cy="14" r="1.25" fill={color} stroke="none" />
    </svg>
  );
}
function IconSparkle({ size = 23, color = "#fff" }) {
  return (
    <svg {...svgProps(size, color)}>
      <path d="M10 3.5l1.7 4.8 4.8 1.7-4.8 1.7L10 16.5 8.3 11.7 3.5 10l4.8-1.7z" />
      <path d="M17.5 14.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" />
    </svg>
  );
}
function IconPlus({ size = 24, color = c.plum }) {
  return <svg {...svgProps(size, color, 2.6)}><path d="M12 5.5v13M5.5 12h13" /></svg>;
}
function IconChevron({ size = 16, color = c.faint }) {
  return <svg {...svgProps(size, color, 2.1)}><path d="M6.5 9.5l5.5 5 5.5-5" /></svg>;
}

// ── Global style ──────────────────────────────────────────────────────────────
function GlobalStyle() {
  return (
    <style>{`
      * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
      body { margin: 0; background: #F7F0FB; -webkit-font-smoothing: antialiased; }
      button { font-family: inherit; }
      :focus-visible { outline: 2.5px solid ${c.plumSoft}; outline-offset: 2px; border-radius: 8px; }
      input[type=number]::-webkit-outer-spin-button,
      input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      input[type=number] { -moz-appearance: textfield; }
      .noscroll::-webkit-scrollbar { display: none; }
      @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
      }
    `}</style>
  );
}

// ── Primitives ────────────────────────────────────────────────────────────────
function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "24px 0 12px" }}>
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: c.ink, letterSpacing: "-0.01em" }}>
        {children}
      </h2>
      {right}
    </div>
  );
}

function Tag({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span style={{
      background: bg, color: fg, borderRadius: 999,
      padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

function Track({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  return (
    <div style={{ height: 6, background: "#EFE9F3", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999 }} />
    </div>
  );
}

function Btn({
  children, onClick, tone = "plum", disabled, full, style: extra,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "plum" | "soft" | "gold";
  disabled?: boolean;
  full?: boolean;
  style?: React.CSSProperties;
}) {
  const tones: Record<string, React.CSSProperties> = {
    plum: { background: c.plum, color: "#fff" },
    gold: { background: c.gold, color: c.plum },
    soft: { background: "#F2ECF7", color: c.ink },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        border: "none", borderRadius: 16, padding: "14px 20px",
        fontSize: 15, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, width: full ? "100%" : undefined,
        ...tones[tone], ...extra,
      }}
    >
      {children}
    </button>
  );
}

function MiniBtn({ children, onClick, color = c.body, bg = "#F4EFF8" }: {
  children: React.ReactNode; onClick?: () => void; color?: string; bg?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "none", background: bg, color, borderRadius: 999,
        padding: "6px 13px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Chip({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 14, background: bg,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...card, padding: "36px 24px", textAlign: "center", color: c.body, fontSize: 14, lineHeight: 1.55 }}>
      {children}
    </div>
  );
}

function Toast({ msg, tone, onClose }: { msg: string; tone: "ok" | "bad"; onClose: () => void }) {
  useEffect(() => {
    const id = setTimeout(onClose, 2800);
    return () => clearTimeout(id);
  }, [onClose]);
  return (
    <div role="status" style={{
      position: "fixed", bottom: 108, left: "50%", transform: "translateX(-50%)",
      background: tone === "ok" ? c.plum : c.bad, color: "#fff",
      padding: "12px 20px", borderRadius: 999, fontSize: 14, fontWeight: 600,
      maxWidth: "calc(100vw - 40px)", zIndex: 500,
      boxShadow: "0 8px 26px rgba(46,11,61,0.28)", animation: "fade .18s ease",
    }}>
      {msg}
    </div>
  );
}

function ConfirmDialog({ title, body, onConfirm, onCancel }: {
  title: string; body: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, background: "rgba(39,18,51,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, zIndex: 600, animation: "fade .15s ease",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, borderRadius: 24, padding: 24, maxWidth: 320, width: "100%" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: c.ink, marginBottom: 6 }}>{title}</div>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: c.body, lineHeight: 1.5 }}>{body}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn tone="soft" onClick={onCancel} full>Cancel</Btn>
          <Btn onClick={onConfirm} full style={{ background: c.bad, color: "#fff" }}>Delete</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Bottom sheet ──────────────────────────────────────────────────────────────
function Sheet({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(39,18,51,0.45)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        zIndex: 550, animation: "fade .18s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FBF8FD", width: "100%", maxWidth: 480,
          borderRadius: "28px 28px 0 0", padding: "10px 20px 28px",
          maxHeight: "92vh", overflowY: "auto",
          animation: "sheetUp .26s cubic-bezier(.22,.9,.3,1)",
        }}
      >
        <div style={{ width: 42, height: 4, borderRadius: 999, background: "#E2D9EA", margin: "0 auto 16px" }} />
        <div style={{ fontSize: 19, fontWeight: 800, color: c.ink, marginBottom: 18, letterSpacing: "-0.01em" }}>
          {title}
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: c.body, marginBottom: 7 }}>{label}</div>
      {children}
    </div>
  );
}

function Choices({ options, value, onChange, colorFor }: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  colorFor?: (v: string) => string;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map((o) => {
        const on = value === o;
        const col = colorFor ? colorFor(o) : c.plum;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            style={{
              flex: "1 1 0", minWidth: 74, padding: "12px 8px", borderRadius: 14,
              border: "none", background: on ? col : "#F1EBF6",
              color: on ? "#fff" : c.body,
              fontSize: 14, fontWeight: on ? 700 : 600, cursor: "pointer",
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

// ── Month selector ────────────────────────────────────────────────────────────
function MonthRow({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  const months: string[] = [];
  const now = new Date();
  for (let i = -5; i <= 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const wrap = useRef<HTMLDivElement>(null);
  const active = useRef<HTMLButtonElement>(null);

  // The chosen month is usually the latest, i.e. off the right edge on a phone.
  useEffect(() => {
    const w = wrap.current, a = active.current;
    if (!w || !a) return;
    w.scrollLeft = a.offsetLeft - w.clientWidth / 2 + a.clientWidth / 2;
  }, [value]);

  return (
    <div ref={wrap} className="noscroll" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "2px 0" }}>
      {months.map((m) => {
        const on = value === m;
        return (
          <button
            key={m}
            ref={on ? active : undefined}
            onClick={() => onChange(m)}
            style={{
              border: "none", borderRadius: 999, padding: "9px 16px",
              background: on ? c.plum : c.card,
              color: on ? "#fff" : c.body,
              fontSize: 13.5, fontWeight: on ? 700 : 600,
              whiteSpace: "nowrap", cursor: "pointer", flexShrink: 0,
              boxShadow: on ? "0 4px 12px rgba(46,11,61,0.22)" : "0 1px 6px rgba(46,11,61,0.05)",
            }}
          >
            {fmtMonth(m)}
          </button>
        );
      })}
    </div>
  );
}

// ── Segmented control ─────────────────────────────────────────────────────────
function Segmented<T extends string>({ options, value, onChange }: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ ...card, display: "flex", padding: 5, borderRadius: 18, gap: 4 }}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            style={{
              flex: 1, border: "none", borderRadius: 14, padding: "12px 8px",
              background: on ? c.plum : "transparent",
              color: on ? "#fff" : c.body,
              fontSize: 14.5, fontWeight: on ? 700 : 600, cursor: "pointer",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Calendar picker ───────────────────────────────────────────────────────────
function CalendarPicker({ value, onChange, allowedDates, monthMode = false, allowedMonths }: {
  value: string;
  onChange: (v: string) => void;
  allowedDates?: string[];
  monthMode?: boolean;
  allowedMonths?: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [nav, setNav] = useState(() => {
    if (value) {
      const d = new Date(value + (monthMode ? "-01" : "") + "T00:00:00");
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      style={{
        ...inp, textAlign: "left", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontWeight: 600, color: value ? c.ink : c.faint,
      }}
    >
      <span>
        {value
          ? monthMode ? fmtMonthLong(value) : fmtDate(value)
          : monthMode ? "Choose a month" : "Choose a date"}
      </span>
      <IconChevron />
    </button>
  );

  const pop: React.CSSProperties = {
    position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 700,
    background: c.card, borderRadius: 20, padding: 14,
    boxShadow: "0 12px 32px rgba(46,11,61,0.18)",
  };
  const navBtn: React.CSSProperties = {
    background: "#F4EFF8", border: "none", width: 30, height: 30, borderRadius: "50%",
    cursor: "pointer", fontSize: 16, color: c.ink, lineHeight: 1,
  };

  if (monthMode) {
    return (
      <div ref={ref} style={{ position: "relative" }}>
        {trigger}
        {open && (
          <div style={{ ...pop, minWidth: 250 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <button type="button" style={navBtn} onClick={() => setNav((n) => ({ ...n, year: n.year - 1 }))}>‹</button>
              <span style={{ fontSize: 15, fontWeight: 800, color: c.ink, ...num }}>{nav.year}</span>
              <button type="button" style={navBtn} onClick={() => setNav((n) => ({ ...n, year: n.year + 1 }))}>›</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
              {M_SHORT.map((m, i) => {
                const key = `${nav.year}-${String(i + 1).padStart(2, "0")}`;
                const allowed = allowedMonths ? allowedMonths.includes(key) : true;
                const on = value === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!allowed}
                    onClick={() => { onChange(key); setOpen(false); }}
                    style={{
                      padding: "11px 4px", borderRadius: 12, border: "none",
                      cursor: allowed ? "pointer" : "not-allowed",
                      fontSize: 13.5, fontWeight: on ? 700 : 600,
                      background: on ? c.plum : "transparent",
                      color: on ? "#fff" : allowed ? c.ink : "#DDD4E4",
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

  const firstDay = new Date(nav.year, nav.month, 1).getDay();
  const daysInMonth = new Date(nav.year, nav.month + 1, 0).getDate();
  const todayStr = today();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {trigger}
      {open && (
        <div style={{ ...pop, minWidth: 278 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button type="button" style={navBtn} onClick={() => setNav((n) => {
              const d = new Date(n.year, n.month - 1, 1);
              return { year: d.getFullYear(), month: d.getMonth() };
            })}>‹</button>
            <span style={{ fontSize: 15, fontWeight: 800, color: c.ink }}>
              {M_LONG[nav.month]} {nav.year}
            </span>
            <button type="button" style={navBtn} onClick={() => setNav((n) => {
              const d = new Date(n.year, n.month + 1, 1);
              return { year: d.getFullYear(), month: d.getMonth() };
            })}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 2 }}>
            {["S","M","T","W","T","F","S"].map((d, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: c.faint, padding: "4px 0" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} />;
              const ds = `${nav.year}-${String(nav.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const allowed = allowedDates ? allowedDates.includes(ds) : true;
              const on = value === ds;
              const isToday = ds === todayStr;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!allowed}
                  onClick={() => { onChange(ds); setOpen(false); }}
                  style={{
                    padding: "9px 0", borderRadius: 10, border: "none",
                    cursor: allowed ? "pointer" : "default",
                    fontSize: 13, fontWeight: on || isToday ? 700 : 500,
                    background: on ? c.plum : isToday ? "#F4EFF8" : "transparent",
                    color: on ? "#fff" : allowed ? c.ink : "#DDD4E4",
                    ...num,
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

// ── Hero balance card ─────────────────────────────────────────────────────────
function BalanceCard({ label, amount, foot, onAdd, progress }: {
  label: string; amount: string; foot: React.ReactNode; onAdd?: () => void;
  progress?: { value: number; max: number };
}) {
  const pct = progress
    ? Math.max(0, Math.min(100, progress.max > 0 ? (progress.value / progress.max) * 100 : 0))
    : 0;
  return (
    <div style={{
      position: "relative", overflow: "hidden", borderRadius: 26, padding: "22px 22px 20px",
      background: `linear-gradient(135deg, ${c.plumMid} 0%, ${c.plum} 52%, ${c.plumSoft} 118%)`,
      boxShadow: "0 12px 30px rgba(46,11,61,0.28)",
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(115% 85% at 88% 8%, rgba(255,206,31,0.22), transparent 58%)",
      }} />
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.68)", fontWeight: 600 }}>{label}</div>
        <div style={{
          fontSize: 38, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em",
          lineHeight: 1.15, margin: "5px 0 14px", ...num,
        }}>
          {amount}
        </div>
        {progress && (
          <div style={{ marginBottom: 12 }}>
            <div style={{
              height: 7, borderRadius: 999, overflow: "hidden",
              background: "rgba(255,255,255,0.18)",
            }}>
              <div style={{ width: `${pct}%`, height: "100%", background: c.gold, borderRadius: 999 }} />
            </div>
            <div style={{
              fontSize: 12, fontWeight: 700, color: c.gold, marginTop: 7, ...num,
            }}>
              {Math.round(pct)}% of {rm(progress.max)}
            </div>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14 }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.45 }}>{foot}</div>
          {onAdd && (
            <button
              onClick={onAdd}
              aria-label="Add"
              style={{
                width: 48, height: 48, borderRadius: "50%", border: "none",
                background: c.gold, cursor: "pointer", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 6px 16px rgba(255,206,31,0.42)",
              }}
            >
              <IconPlus />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pastel pair ───────────────────────────────────────────────────────────────
function PastelTile({ label, amount, bg, fg }: {
  label: string; amount: string; bg: string; fg: string;
}) {
  return (
    <div style={{ background: bg, borderRadius: 20, padding: "15px 16px" }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: fg, opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 800, color: c.ink, marginTop: 4, letterSpacing: "-0.02em", ...num }}>
        {amount}
      </div>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
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

// ── Payment status fields ─────────────────────────────────────────────────────
// Module scope on purpose: nested inside a component, React remounts it on every
// render and the amount input loses focus after each keystroke.
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
  const valid = amountPaid !== "" && !isNaN(amt) && amt > 0;
  const state = paid && !partial ? "Paid in full" : partial ? "Part paid" : "Not paid";

  return (
    <>
      <Field label="Status">
        <Choices
          options={["Not paid", "Part paid", "Paid in full"]}
          value={state}
          onChange={(v) => {
            onPaid(v === "Paid in full");
            onPartial(v === "Part paid");
          }}
          colorFor={(v) => (v === "Paid in full" ? c.good : v === "Part paid" ? c.warn : c.plum)}
        />
      </Field>

      {partial && (
        <Field label={`Paid so far, of ${rm(rate)}`}>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max={rate}
            value={amountPaid}
            onChange={(e) => onAmountPaid(e.target.value)}
            placeholder={String(rate / 2)}
            style={{ ...inp, fontSize: 17, fontWeight: 700, ...num }}
          />
          {valid && (
            <div style={{ fontSize: 13, fontWeight: 600, color: amt >= rate ? c.good : c.warn, marginTop: 8 }}>
              {amt >= rate ? "That covers the full amount." : `${rm(rate - amt)} still owed.`}
            </div>
          )}
        </Field>
      )}

      {(paid || partial) && (
        <Field label={partial ? "Date of that payment" : "Date paid"}>
          <CalendarPicker value={paidDate} onChange={onPaidDate} />
        </Field>
      )}
    </>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (role: "admin" | "eman") => void }) {
  const [tab, setTab] = useState<"admin" | "eman">("admin");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const locked = Date.now() < lockUntil;

  function signIn() {
    if (locked) return;
    if (pin === ADMIN_PIN) { setError(""); onLogin("admin"); return; }
    const next = attempts + 1;
    setAttempts(next);
    if (next >= 3) {
      setLockUntil(Date.now() + 30000);
      setAttempts(0);
      setError("Too many tries. Wait 30 seconds.");
    } else {
      setError(`That PIN didn't match. ${3 - next} ${3 - next === 1 ? "try" : "tries"} left.`);
    }
    setPin("");
  }

  return (
    <div style={{
      minHeight: "100vh", background: PAGE_BG, fontFamily: FONT,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 22,
    }}>
      <GlobalStyle />
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 20, margin: "0 auto 14px",
            background: `linear-gradient(135deg, ${c.plumMid}, ${c.plum})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: c.gold, fontSize: 21, fontWeight: 800,
            boxShadow: "0 10px 24px rgba(46,11,61,0.26)",
          }}>
            RK
          </div>
          <h1 style={{ fontSize: 23, fontWeight: 800, color: c.ink, margin: 0, letterSpacing: "-0.02em" }}>
            Rumah Kucen
          </h1>
          <p style={{ color: c.body, fontSize: 14, margin: "4px 0 0" }}>Payroll</p>
        </div>

        <div style={{ ...card, borderRadius: 24, padding: 20 }}>
          <div style={{ marginBottom: 18 }}>
            <Segmented
              options={[{ id: "admin", label: "Admin" }, { id: "eman", label: STAFF_NAME }]}
              value={tab}
              onChange={(v) => { setTab(v); setPin(""); setError(""); }}
            />
          </div>

          {tab === "admin" ? (
            <>
              <Field label="Admin PIN">
                <input
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.slice(0, 4))}
                  onKeyDown={(e) => e.key === "Enter" && signIn()}
                  placeholder="••••"
                  disabled={locked}
                  style={{ ...inp, letterSpacing: "0.45em", fontSize: 18, fontWeight: 700, textAlign: "center", ...num }}
                />
              </Field>
              {error && (
                <p style={{ color: c.bad, fontSize: 13, fontWeight: 600, margin: "-6px 0 14px", lineHeight: 1.45 }}>
                  {error}
                </p>
              )}
              <Btn onClick={signIn} disabled={locked} full>
                {locked ? "Locked for 30 seconds" : "Sign in"}
              </Btn>
            </>
          ) : (
            <>
              <p style={{ color: c.body, fontSize: 14, lineHeight: 1.55, margin: "0 0 18px" }}>
                See what you've been paid this month and what's still owed.
              </p>
              <Btn onClick={() => onLogin("eman")} full>Continue as {STAFF_NAME}</Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Salary ────────────────────────────────────────────────────────────────────
function SalaryPage({ isAdmin, openAddRef }: {
  isAdmin: boolean;
  openAddRef: React.MutableRefObject<(() => void) | null>;
}) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "bad" } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);

  const [fDate, setFDate] = useState(today());
  const [fMonth, setFMonth] = useState(currentMonth());
  const [fPaidBy, setFPaidBy] = useState("Alya");
  const [fAmount, setFAmount] = useState("");
  const [fNote, setFNote] = useState("Payout");

  const showToast = useCallback((msg: string, tone: "ok" | "bad") => setToast({ msg, tone }), []);

  const load = useCallback(() => {
    setLoading(true);
    sb("GET", "salary_payments", undefined, {
      order: "payment_date.desc",
      for_month: `eq.${month}`,
    })
      .then((d) => setPayments(d || []))
      .catch(() => showToast("Couldn't load. Check your connection.", "bad"))
      .finally(() => setLoading(false));
  }, [month, showToast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = useCallback(() => {
    setEditing(null);
    setFDate(today());
    setFMonth(month);
    setFPaidBy("Alya");
    setFAmount("");
    setFNote("Payout");
    setShowForm(true);
  }, [month]);

  useEffect(() => {
    openAddRef.current = openAdd;
    return () => { openAddRef.current = null; };
  }, [openAdd, openAddRef]);

  function openEdit(p: Payment) {
    setEditing(p);
    setFDate(p.payment_date);
    setFMonth(p.for_month);
    setFPaidBy(p.paid_by);
    setFAmount(String(p.amount));
    setFNote(p.note || "Payout");
    setShowForm(true);
  }

  async function save() {
    const amt = parseFloat(fAmount);
    if (!fDate || !fMonth || isNaN(amt) || amt <= 0) {
      showToast("Fill in every field, with an amount above zero.", "bad");
      return;
    }
    if (!NOTE_OPTIONS.includes(fNote) || !["Alya", "Nina"].includes(fPaidBy)) {
      showToast("Pick who paid and the type.", "bad");
      return;
    }
    try {
      const payload = {
        payment_date: fDate, for_month: fMonth,
        paid_by: fPaidBy, amount: amt, note: fNote,
      };
      if (editing) await sb("PATCH", `salary_payments?id=eq.${editing.id}`, payload);
      else await sb("POST", "salary_payments", payload);
      showToast(editing ? "Payment updated" : "Payment added", "ok");
      setShowForm(false);
      load();
    } catch {
      showToast("Couldn't save. Try again.", "bad");
    }
  }

  async function del() {
    if (!confirm) return;
    try {
      await sb("DELETE", `salary_payments?id=eq.${confirm}`);
      showToast("Payment deleted", "ok");
      setConfirm(null);
      load();
    } catch {
      showToast("Couldn't delete. Try again.", "bad");
    }
  }

  const alyaPaid = payments.filter((p) => p.paid_by === "Alya").reduce((s, p) => s + p.amount, 0);
  const ninaPaid = payments.filter((p) => p.paid_by === "Nina").reduce((s, p) => s + p.amount, 0);
  const total = alyaPaid + ninaPaid;
  const owed = Math.max(0, MONTHLY_SALARY - total);

  // Doubles as the pastel pair: these are the only two numbers the hero doesn't show.
  const shareCard = (name: string, paid: number, share: number, color: string, bg: string) => {
    const left = Math.max(0, share - paid);
    return (
      <div style={{ background: bg, borderRadius: 20, padding: 15, flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 9 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color }}>{name}</span>
          {left === 0
            ? <Tag label="Done" bg="rgba(255,255,255,0.75)" fg={c.mintInk} />
            : <Tag label={`${rm(left)} left`} bg="rgba(255,255,255,0.75)" fg={color} />}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 9 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: c.ink, letterSpacing: "-0.02em", ...num }}>
            {rm(paid)}
          </span>
          <span style={{ fontSize: 12, color: c.body, fontWeight: 600, ...num }}>of {rm(share)}</span>
        </div>
        <div style={{ height: 6, background: "rgba(255,255,255,0.7)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{
            width: `${Math.max(0, Math.min(100, (paid / share) * 100))}%`,
            height: "100%", background: color, borderRadius: 999,
          }} />
        </div>
      </div>
    );
  };

  return (
    <div>
      <BalanceCard
        label={`Paid in ${fmtMonthLong(month)}`}
        amount={rm(total)}
        foot={owed === 0
          ? isAdmin ? `${STAFF_NAME} is fully paid this month.` : "You're fully paid this month."
          : isAdmin
            ? `${rm(owed)} still owed of ${rm(MONTHLY_SALARY)}`
            : `${rm(owed)} still owed`}
        onAdd={isAdmin ? openAdd : undefined}
        progress={isAdmin ? undefined : { value: total, max: MONTHLY_SALARY }}
      />

      {isAdmin && (
        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
          {shareCard("Alya", alyaPaid, ALYA_SHARE, c.alya, c.lilac)}
          {shareCard("Nina", ninaPaid, NINA_SHARE, c.nina, c.blush)}
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <MonthRow value={month} onChange={setMonth} />
      </div>

      <SectionTitle>Payments</SectionTitle>
      {loading ? (
        <Empty>Loading…</Empty>
      ) : payments.length === 0 ? (
        <Empty>
          Nothing logged for {fmtMonthLong(month)} yet.
          {isAdmin && <><br />Tap + to add the first payment.</>}
        </Empty>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {payments.map((p) => {
            const isAlya = p.paid_by === "Alya";
            const noteColor = NOTE_COLOR[p.note] || c.body;
            return (
              <div key={p.id} style={{ ...card, padding: "13px 14px" }}>
                {/* Everything after the chip is one block, so the amount sits on
                    the title line rather than floating off on its own. */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <Chip bg={isAlya ? c.lilac : c.blush}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: isAlya ? c.alya : c.nina }}>
                      {p.paid_by[0]}
                    </span>
                  </Chip>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                      <span style={{
                        fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em",
                        textTransform: "uppercase", color: noteColor,
                      }}>
                        {p.note || "Payout"}
                      </span>
                      <span style={{ fontSize: 17, fontWeight: 500, color: c.ink, flexShrink: 0, ...num }}>
                        {rm(p.amount)}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: c.faint, fontWeight: 500, marginTop: 3 }}>
                      {fmtDate(p.payment_date)}
                    </div>
                    {isAdmin && (
                      <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
                        <MiniBtn onClick={() => openEdit(p)}>Edit</MiniBtn>
                        <MiniBtn onClick={() => setConfirm(p.id)}>Delete</MiniBtn>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <Sheet title={editing ? "Edit payment" : "Add payment"} onClose={() => setShowForm(false)}>
          <Field label="Amount">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={fAmount}
              onChange={(e) => setFAmount(e.target.value)}
              placeholder="750"
              style={{ ...inp, fontSize: 22, fontWeight: 800, ...num }}
            />
          </Field>
          <Field label="Who paid">
            <Choices
              options={["Alya", "Nina"]}
              value={fPaidBy}
              onChange={setFPaidBy}
              colorFor={(v) => (v === "Alya" ? c.alya : c.nina)}
            />
          </Field>
          <Field label="Type">
            <Choices options={NOTE_OPTIONS} value={fNote} onChange={setFNote} />
          </Field>
          <Field label="Date paid">
            <CalendarPicker value={fDate} onChange={setFDate} />
          </Field>
          <Field label="Counts towards">
            <CalendarPicker value={fMonth} onChange={setFMonth} monthMode />
          </Field>
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <Btn tone="soft" onClick={() => setShowForm(false)} full>Cancel</Btn>
            <Btn onClick={save} full>{editing ? "Save changes" : "Add payment"}</Btn>
          </div>
        </Sheet>
      )}

      {toast && <Toast msg={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}
      {confirm && (
        <ConfirmDialog
          title="Delete this payment?"
          body="This removes it for both of you. It can't be undone."
          onConfirm={del}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ── Cleaning ──────────────────────────────────────────────────────────────────
function CleaningPage({ isAdmin, openAddRef }: {
  isAdmin: boolean;
  openAddRef: React.MutableRefObject<(() => void) | null>;
}) {
  const [tab, setTab] = useState<"vacuum" | "deep">("vacuum");
  const [vacuums, setVacuums] = useState<VacuumEntry[]>([]);
  const [deeps, setDeeps] = useState<DeepCleanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "bad" } | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; table: string; label: string } | null>(null);

  const [showVac, setShowVac] = useState(false);
  const [editVac, setEditVac] = useState<VacuumEntry | null>(null);
  const [vacDate, setVacDate] = useState("");
  const [vacPaid, setVacPaid] = useState(false);
  const [vacPartial, setVacPartial] = useState(false);
  const [vacPaidDate, setVacPaidDate] = useState(today());
  const [vacAmount, setVacAmount] = useState("");

  const [showDeep, setShowDeep] = useState(false);
  const [editDeep, setEditDeep] = useState<DeepCleanEntry | null>(null);
  const [deepMonth, setDeepMonth] = useState(currentMonth());
  const [deepPaid, setDeepPaid] = useState(false);
  const [deepPartial, setDeepPartial] = useState(false);
  const [deepPaidDate, setDeepPaidDate] = useState(today());
  const [deepAmount, setDeepAmount] = useState("");

  const showToast = useCallback((msg: string, tone: "ok" | "bad") => setToast({ msg, tone }), []);

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
      showToast("Couldn't load. Check your connection.", "bad");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openVacAdd = useCallback(() => {
    setEditVac(null);
    setVacDate("");
    setVacPaid(false);
    setVacPartial(false);
    setVacPaidDate(today());
    setVacAmount("");
    setShowVac(true);
  }, []);

  const openDeepAdd = useCallback(() => {
    setEditDeep(null);
    const opts = getDeepCleanMonthOptions(deeps.map((d) => d.for_month));
    setDeepMonth(opts[0] || currentMonth());
    setDeepPaid(false);
    setDeepPartial(false);
    setDeepPaidDate(today());
    setDeepAmount("");
    setShowDeep(true);
  }, [deeps]);

  // The + button adds to whichever list is showing.
  useEffect(() => {
    openAddRef.current = tab === "vacuum" ? openVacAdd : openDeepAdd;
    return () => { openAddRef.current = null; };
  }, [tab, openVacAdd, openDeepAdd, openAddRef]);

  function openVacEdit(v: VacuumEntry) {
    setEditVac(v);
    setVacDate(v.friday_date);
    setVacPaid(v.paid);
    setVacPartial(v.partial || false);
    setVacPaidDate(v.paid_date || today());
    setVacAmount(v.remark || "");
    setShowVac(true);
  }

  function openDeepEdit(d: DeepCleanEntry) {
    setEditDeep(d);
    setDeepMonth(d.for_month);
    setDeepPaid(d.paid);
    setDeepPartial(d.partial || false);
    setDeepPaidDate(d.paid_date || today());
    setDeepAmount(d.remark || "");
    setShowDeep(true);
  }

  async function saveVacuum() {
    if (!vacDate) { showToast("Pick a Friday first.", "bad"); return; }
    const full = vacPaid && !vacPartial;
    try {
      const payload = {
        friday_date: vacDate, paid: full, partial: vacPartial,
        paid_date: (full || vacPartial) ? vacPaidDate : null,
        remark: vacPartial ? vacAmount : "",
      };
      if (editVac) await sb("PATCH", `cleaning_vacuum?id=eq.${editVac.id}`, payload);
      else await sb("POST", "cleaning_vacuum", payload);
      showToast(editVac ? "Vacuum updated" : "Vacuum added", "ok");
      setShowVac(false);
      load();
    } catch {
      showToast("Couldn't save. Try again.", "bad");
    }
  }

  async function saveDeep() {
    if (!deepMonth) { showToast("Pick a month first.", "bad"); return; }
    const full = deepPaid && !deepPartial;
    try {
      const payload = {
        for_month: deepMonth, paid: full, partial: deepPartial,
        paid_date: (full || deepPartial) ? deepPaidDate : null,
        remark: deepPartial ? deepAmount : "",
      };
      if (editDeep) await sb("PATCH", `cleaning_deepclean?id=eq.${editDeep.id}`, payload);
      else await sb("POST", "cleaning_deepclean", payload);
      showToast(editDeep ? "Deep clean updated" : "Deep clean added", "ok");
      setShowDeep(false);
      load();
    } catch {
      showToast("Couldn't save. Try again.", "bad");
    }
  }

  async function markFullyPaid(id: string, table: string) {
    try {
      await sb("PATCH", `${table}?id=eq.${id}`, {
        paid: true, partial: false, paid_date: today(), remark: "",
      });
      showToast("Marked paid in full", "ok");
      load();
    } catch {
      showToast("Couldn't update. Try again.", "bad");
    }
  }

  async function deleteEntry() {
    if (!confirm) return;
    try {
      await sb("DELETE", `${confirm.table}?id=eq.${confirm.id}`);
      showToast(`${confirm.label} deleted`, "ok");
      setConfirm(null);
      load();
    } catch {
      showToast("Couldn't delete. Try again.", "bad");
    }
  }

  const fridayOptions = getFridayOptions(vacuums.map((v) => v.friday_date), editVac?.friday_date || null);
  const deepMonthOptions = getDeepCleanMonthOptions(deeps.map((d) => d.for_month), editDeep?.for_month || null);

  const partSum = (list: { remark: string }[]) =>
    list.reduce((s, x) => s + (isNaN(Number(x.remark)) ? 0 : Number(x.remark)), 0);

  const isVac = tab === "vacuum";
  const rate = isVac ? VACUUM_RATE : DEEPCLEAN_RATE;
  const list = isVac ? vacuums : deeps;
  const paidCount = list.filter((x) => x.paid).length;
  const partials = list.filter((x) => x.partial);
  const collected = paidCount * rate + partSum(partials);
  const outstanding = list.length * rate - collected;

  const vacByMonth: Record<string, VacuumEntry[]> = {};
  vacuums.forEach((v) => {
    const m = v.friday_date.slice(0, 7);
    if (!vacByMonth[m]) vacByMonth[m] = [];
    vacByMonth[m].push(v);
  });
  const vacMonths = Object.keys(vacByMonth).sort((a, b) => b.localeCompare(a));

  function entryRow(
    key: string, title: string, paid: boolean, partial: boolean,
    paidDate: string | null, remark: string, onEdit: () => void,
    onMark: () => void, onDelete: () => void
  ) {
    const amt = Number(remark);
    const hasAmt = partial && remark !== "" && !isNaN(amt) && amt > 0;
    const sub = paid
      ? paidDate ? `Paid ${fmtDateShort(paidDate)}` : "Paid in full"
      : hasAmt ? `${rm(amt)} paid · ${rm(rate - amt)} left`
      : partial ? "Part paid" : "Not paid";

    return (
      <div key={key} style={{ ...card, padding: "13px 14px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: c.ink }}>{title}</span>
          <span style={{
            fontSize: 17, fontWeight: 500, flexShrink: 0,
            color: paid ? c.ink : c.faint, ...num,
          }}>
            {rm(rate)}
          </span>
        </div>
        <div style={{
          fontSize: 13, marginTop: 3, fontWeight: 600,
          color: partial ? c.warn : paid ? c.good : c.faint,
        }}>
          {sub}
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
            {partial && (
              <MiniBtn onClick={onMark} color={c.mintInk} bg={c.mint}>Mark paid</MiniBtn>
            )}
            <MiniBtn onClick={onEdit}>Edit</MiniBtn>
            <MiniBtn onClick={onDelete}>Delete</MiniBtn>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <BalanceCard
        label={isVac ? "Collected for vacuums" : "Collected for deep cleans"}
        amount={rm(collected)}
        foot={`${rm(rate)} per ${isVac ? "Friday" : "month"}`}
        onAdd={isAdmin ? (isVac ? openVacAdd : openDeepAdd) : undefined}
      />

      <div style={{ marginTop: 14 }}>
        <Segmented
          options={[{ id: "vacuum" as const, label: "Vacuum" }, { id: "deep" as const, label: "Deep clean" }]}
          value={tab}
          onChange={setTab}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
        <PastelTile
          label={partials.length > 0 ? `Settled · ${partials.length} part paid` : "Settled"}
          amount={`${paidCount} of ${list.length}`}
          bg={c.mint}
          fg={c.mintInk}
        />
        <PastelTile
          label="Outstanding"
          amount={rm(Math.max(0, outstanding))}
          bg={c.blush}
          fg={c.blushInk}
        />
      </div>

      {isVac ? (
        <>
          {loading ? (
            <><SectionTitle>Fridays</SectionTitle><Empty>Loading…</Empty></>
          ) : vacuums.length === 0 ? (
            <>
              <SectionTitle>Fridays</SectionTitle>
              <Empty>
                No vacuums logged yet.
                {isAdmin && <><br />Tap + to add the first Friday.</>}
              </Empty>
            </>
          ) : (
            vacMonths.map((m) => (
              <div key={m}>
                <SectionTitle>{fmtMonthLong(m)}</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {vacByMonth[m].map((v) =>
                    entryRow(
                      v.id, fmtDate(v.friday_date), v.paid, v.partial || false,
                      v.paid_date, v.remark,
                      () => openVacEdit(v),
                      () => markFullyPaid(v.id, "cleaning_vacuum"),
                      () => setConfirm({ id: v.id, table: "cleaning_vacuum", label: "Vacuum" })
                    )
                  )}
                </div>
              </div>
            ))
          )}
        </>
      ) : (
        <>
          <SectionTitle>Months</SectionTitle>
          {loading ? (
            <Empty>Loading…</Empty>
          ) : deeps.length === 0 ? (
            <Empty>
              No deep cleans logged yet.
              {isAdmin && <><br />Tap + to add the first month.</>}
            </Empty>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {deeps.map((d) =>
                entryRow(
                  d.id, fmtMonthLong(d.for_month), d.paid, d.partial || false,
                  d.paid_date, d.remark,
                  () => openDeepEdit(d),
                  () => markFullyPaid(d.id, "cleaning_deepclean"),
                  () => setConfirm({ id: d.id, table: "cleaning_deepclean", label: "Deep clean" })
                )
              )}
            </div>
          )}
        </>
      )}

      {showVac && (
        <Sheet title={editVac ? "Edit vacuum" : "Add vacuum"} onClose={() => setShowVac(false)}>
          <Field label="Friday">
            <CalendarPicker value={vacDate} onChange={setVacDate} allowedDates={fridayOptions} />
          </Field>
          <PaymentStatusFields
            paid={vacPaid} onPaid={setVacPaid}
            partial={vacPartial} onPartial={setVacPartial}
            paidDate={vacPaidDate} onPaidDate={setVacPaidDate}
            amountPaid={vacAmount} onAmountPaid={setVacAmount}
            rate={VACUUM_RATE}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <Btn tone="soft" onClick={() => setShowVac(false)} full>Cancel</Btn>
            <Btn onClick={saveVacuum} full>{editVac ? "Save changes" : "Add vacuum"}</Btn>
          </div>
        </Sheet>
      )}

      {showDeep && (
        <Sheet title={editDeep ? "Edit deep clean" : "Add deep clean"} onClose={() => setShowDeep(false)}>
          <Field label="Month">
            <CalendarPicker value={deepMonth} onChange={setDeepMonth} monthMode allowedMonths={deepMonthOptions} />
          </Field>
          <PaymentStatusFields
            paid={deepPaid} onPaid={setDeepPaid}
            partial={deepPartial} onPartial={setDeepPartial}
            paidDate={deepPaidDate} onPaidDate={setDeepPaidDate}
            amountPaid={deepAmount} onAmountPaid={setDeepAmount}
            rate={DEEPCLEAN_RATE}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <Btn tone="soft" onClick={() => setShowDeep(false)} full>Cancel</Btn>
            <Btn onClick={saveDeep} full>{editDeep ? "Save changes" : "Add deep clean"}</Btn>
          </div>
        </Sheet>
      )}

      {toast && <Toast msg={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}
      {confirm && (
        <ConfirmDialog
          title={`Delete this ${confirm.label.toLowerCase()}?`}
          body="This removes the entry for both of you. It can't be undone."
          onConfirm={deleteEntry}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ── Bottom navigation ─────────────────────────────────────────────────────────
function BottomNav({ tab, onTab, onAdd }: {
  tab: "salary" | "cleaning";
  onTab: (t: "salary" | "cleaning") => void;
  onAdd?: () => void;
}) {
  const item = (id: "salary" | "cleaning", label: string, Icon: typeof IconWallet) => {
    const on = tab === id;
    const col = on ? c.gold : "rgba(255,255,255,0.58)";
    return (
      <button
        onClick={() => onTab(id)}
        style={{
          flex: 1, background: "none", border: "none", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          padding: "8px 0",
        }}
      >
        <Icon color={col} size={22} />
        <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{label}</span>
      </button>
    );
  };

  return (
    <nav style={{
      position: "fixed", bottom: 16, left: 0, right: 0, zIndex: 400,
      display: "flex", justifyContent: "center", pointerEvents: "none",
    }}>
      <div style={{
        position: "relative", pointerEvents: "auto",
        width: "min(420px, calc(100% - 32px))",
        background: c.plum, borderRadius: 30,
        display: "flex", alignItems: "center",
        boxShadow: "0 10px 30px rgba(46,11,61,0.34)",
      }}>
        {item("salary", "Salary", IconWallet)}
        {onAdd && <div style={{ width: 76, flexShrink: 0 }} />}
        {item("cleaning", "Cleaning", IconSparkle)}

        {onAdd && (
          <button
            onClick={onAdd}
            aria-label="Add entry"
            style={{
              position: "absolute", left: "50%", top: -20,
              transform: "translateX(-50%)",
              width: 58, height: 58, borderRadius: "50%",
              background: c.gold, border: "5px solid #FAF4FA", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 20px rgba(232,180,0,0.46)",
            }}
          >
            <IconPlus size={25} />
          </button>
        )}
      </div>
    </nav>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [role, setRole] = useState<"admin" | "eman" | null>(null);
  const [tab, setTab] = useState<"salary" | "cleaning">("salary");
  const openAddRef = useRef<(() => void) | null>(null);

  if (!role) return <LoginScreen onLogin={setRole} />;
  const isAdmin = role === "admin";

  return (
    <div style={{ minHeight: "100vh", background: PAGE_BG, fontFamily: FONT, color: c.ink }}>
      <GlobalStyle />

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 18px 130px" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 13, color: c.body, fontWeight: 600 }}>Hello,</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: c.ink, letterSpacing: "-0.02em" }}>
              {isAdmin ? "Admin" : STAFF_NAME}
            </div>
          </div>
          <button
            onClick={() => setRole(null)}
            style={{
              border: "none", background: c.card, color: c.body,
              borderRadius: 999, padding: "9px 16px",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 2px 10px rgba(46,11,61,0.07)",
            }}
          >
            Sign out
          </button>
        </header>

        {tab === "salary"
          ? <SalaryPage isAdmin={isAdmin} openAddRef={openAddRef} />
          : <CleaningPage isAdmin={isAdmin} openAddRef={openAddRef} />}
      </div>

      <BottomNav
        tab={tab}
        onTab={setTab}
        onAdd={isAdmin ? () => openAddRef.current?.() : undefined}
      />
    </div>
  );
}