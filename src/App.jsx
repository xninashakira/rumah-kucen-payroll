import { useState, useEffect, useCallback } from 'react';

// ─── CONFIGURE THESE TWO LINES ───────────────────────────────────────────────
const SUPABASE_URL = 'https://wtouazgqnnqlxauuevxn.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0b3Vhemdxbm5xbHhhdXVldnhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjQ4MDIsImV4cCI6MjA5NzcwMDgwMn0.QtWPyzA7JhEFW0k9iEKxeSi3-1iGNTgGLw1aygSOCCc';
// ─────────────────────────────────────────────────────────────────────────────

const MONTHLY_SALARY = 1500;
const ALYA_SHARE = 750;
const NINA_SHARE = 750;
const STAFF_NAME = 'Eman';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function getTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(d.getDate()).padStart(2, '0')}`;
}
function getTodayYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function ymLabel(ym) {
  const [y, m] = ym.split('-');
  return `${MONTHS[parseInt(m) - 1]} ${y}`;
}

// Minimal Supabase REST helper (no SDK needed)
async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

function getForMonthOptions() {
  const opts = [];
  const base = new Date();
  for (let i = -6; i <= 6; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}`;
    opts.push(ym);
  }
  return opts;
}

export default function SalaryTracker() {
  const todayISO = getTodayISO();
  const todayYM = getTodayYM();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMonth, setViewMonth] = useState(todayYM);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    payment_date: todayISO,
    for_month: todayYM,
    paid_by: 'Alya',
    amount: '',
    note: '',
  });

  const fetchPayments = useCallback(async () => {
    try {
      const data = await sbFetch('salary_payments?order=payment_date.asc');
      setPayments(data);
      setError(null);
    } catch (e) {
      setError('Could not connect to database. Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Poll every 10s so both users see live updates
  useEffect(() => {
    const id = setInterval(fetchPayments, 10000);
    return () => clearInterval(id);
  }, [fetchPayments]);

  const monthPayments = payments
    .filter((p) => p.for_month === viewMonth)
    .sort((a, b) => a.payment_date.localeCompare(b.payment_date));

  const alyaPaid = monthPayments
    .filter((p) => p.paid_by === 'Alya')
    .reduce((s, p) => s + parseFloat(p.amount), 0);
  const ninaPaid = monthPayments
    .filter((p) => p.paid_by === 'Nina')
    .reduce((s, p) => s + parseFloat(p.amount), 0);
  const alyaRemaining = Math.max(0, ALYA_SHARE - alyaPaid);
  const ninaRemaining = Math.max(0, NINA_SHARE - ninaPaid);
  const totalPaid = alyaPaid + ninaPaid;
  const totalRemaining = MONTHLY_SALARY - totalPaid;
  const progressPct = Math.min(100, (totalPaid / MONTHLY_SALARY) * 100);

  const allMonths = Array.from(
    new Set([todayYM, ...payments.map((p) => p.for_month)])
  ).sort();
  const forMonthOptions = getForMonthOptions();

  function openAddForm() {
    setEditId(null);
    setForm({
      payment_date: todayISO,
      for_month: viewMonth,
      paid_by: 'Alya',
      amount: '',
      note: '',
    });
    setShowForm(true);
  }
  function handleEdit(entry) {
    setEditId(entry.id);
    setForm({
      payment_date: entry.payment_date,
      for_month: entry.for_month,
      paid_by: entry.paid_by,
      amount: String(entry.amount),
      note: entry.note || '',
    });
    setShowForm(true);
  }
  async function handleSave() {
    const amt = parseFloat(form.amount);
    if (!form.payment_date || !form.for_month || !amt || amt <= 0) return;
    setSaving(true);
    try {
      const payload = {
        payment_date: form.payment_date,
        for_month: form.for_month,
        paid_by: form.paid_by,
        amount: amt,
        note: form.note.trim(),
      };
      if (editId) {
        await sbFetch(`salary_payments?id=eq.${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await sbFetch('salary_payments', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      await fetchPayments();
      setViewMonth(form.for_month);
      setShowForm(false);
      setEditId(null);
    } catch (e) {
      alert('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  }
  async function handleDelete(id) {
    if (!confirm('Delete this payment?')) return;
    try {
      await sbFetch(`salary_payments?id=eq.${id}`, {
        method: 'DELETE',
        prefer: 'return=minimal',
      });
      await fetchPayments();
    } catch (e) {
      alert('Delete failed: ' + e.message);
    }
  }

  function isAdvance(entry) {
    return entry.payment_date.slice(0, 7) < entry.for_month;
  }

  const alyaColor = '#7c5cbf',
    ninaColor = '#e06b9a';
  const alyaBg = '#ede9f5',
    ninaBg = '#fae8f0';

  if (loading)
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f8f5f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter',sans-serif",
        }}
      >
        <div style={{ textAlign: 'center', color: '#888' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <p>Connecting to database…</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f8f5f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter',sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: 28,
            maxWidth: 420,
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ margin: '0 0 8px', color: '#1a1a2e' }}>
            Database not connected
          </h2>
          <p style={{ color: '#777', fontSize: 14, lineHeight: 1.6 }}>
            {error}
          </p>
          <p style={{ color: '#aaa', fontSize: 12, marginTop: 16 }}>
            Follow the setup steps below and replace <code>SUPABASE_URL</code>{' '}
            and <code>SUPABASE_ANON_KEY</code> in the code.
          </p>
          <button
            onClick={fetchPayments}
            style={{
              marginTop: 16,
              background: '#1a1a2e',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8f5f0',
        fontFamily: "'Inter','Segoe UI',sans-serif",
        paddingBottom: 48,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#1a1a2e',
          padding: '28px 24px 24px',
          color: '#fff',
        }}
      >
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: 2,
              color: '#a89fc0',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Rumah Kucen Payroll · Live
          </p>
          <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 700 }}>
            {STAFF_NAME}'s Salary
          </h1>
          <p style={{ margin: 0, color: '#c4b8d8', fontSize: 13 }}>
            RM{MONTHLY_SALARY}/month · Alya RM{ALYA_SHARE} · Nina RM{NINA_SHARE}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px' }}>
        {/* Month selector */}
        <div style={{ paddingTop: 18, paddingBottom: 4 }}>
          <p
            style={{
              margin: '0 0 6px',
              fontSize: 11,
              color: '#888',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Viewing Payroll Month
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {allMonths.map((ym) => (
              <button
                key={ym}
                onClick={() => setViewMonth(ym)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 20,
                  border: '1.5px solid',
                  borderColor: viewMonth === ym ? '#1a1a2e' : '#ddd',
                  background: viewMonth === ym ? '#1a1a2e' : '#fff',
                  color: viewMonth === ym ? '#fff' : '#555',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {ymLabel(ym)}
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginTop: 14,
          }}
        >
          {[
            {
              label: 'Alya',
              paid: alyaPaid,
              share: ALYA_SHARE,
              remaining: alyaRemaining,
              color: alyaColor,
              bg: alyaBg,
            },
            {
              label: 'Nina',
              paid: ninaPaid,
              share: NINA_SHARE,
              remaining: ninaRemaining,
              color: ninaColor,
              bg: ninaBg,
            },
          ].map(({ label, paid, share, remaining, color, bg }) => (
            <div
              key={label}
              style={{
                background: '#fff',
                borderRadius: 14,
                padding: 16,
                borderLeft: `4px solid ${color}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  color,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  fontWeight: 600,
                }}
              >
                {label}
              </p>
              <p
                style={{
                  margin: '6px 0 2px',
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#1a1a2e',
                }}
              >
                RM{paid.toFixed(0)}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
                paid of RM{share}
              </p>
              <div
                style={{
                  marginTop: 8,
                  background: bg,
                  borderRadius: 6,
                  height: 5,
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, (paid / share) * 100)}%`,
                    background: color,
                    borderRadius: 6,
                    height: 5,
                  }}
                />
              </div>
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: 13,
                  fontWeight: 600,
                  color: remaining === 0 ? '#3bb07a' : color,
                }}
              >
                {remaining === 0 ? '✓ Fully paid' : `RM${remaining} remaining`}
              </p>
            </div>
          ))}
        </div>

        {/* Total bar */}
        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            padding: '16px 18px',
            marginTop: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>
              Total · {ymLabel(viewMonth)}
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>
              RM{totalPaid}{' '}
              <span style={{ fontSize: 12, color: '#aaa', fontWeight: 400 }}>
                / RM{MONTHLY_SALARY}
              </span>
            </span>
          </div>
          <div
            style={{
              marginTop: 10,
              background: '#eee',
              borderRadius: 8,
              height: 8,
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg,#7c5cbf,#e06b9a)',
                borderRadius: 8,
                height: 8,
              }}
            />
          </div>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 13,
              color: totalRemaining === 0 ? '#3bb07a' : '#666',
              fontWeight: totalRemaining === 0 ? 700 : 400,
            }}
          >
            {totalRemaining === 0
              ? `✓ ${STAFF_NAME} fully paid for ${ymLabel(viewMonth)}`
              : `RM${totalRemaining} still to be paid`}
          </p>
        </div>

        {/* Payment log */}
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: '#1a1a2e',
              }}
            >
              Payment Log
            </h2>
            {!showForm && (
              <button
                onClick={openAddForm}
                style={{
                  background: '#1a1a2e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Add Payment
              </button>
            )}
          </div>

          {showForm && (
            <div
              style={{
                background: '#fff',
                borderRadius: 14,
                padding: 18,
                marginBottom: 12,
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                border: '1.5px solid #e0d8f0',
              }}
            >
              <p
                style={{
                  margin: '0 0 14px',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#1a1a2e',
                }}
              >
                {editId ? 'Edit Payment' : 'Record a Payment'}
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      color: '#888',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                    }}
                  >
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={form.payment_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, payment_date: e.target.value }))
                    }
                    style={{
                      display: 'block',
                      width: '100%',
                      marginTop: 4,
                      padding: '9px 10px',
                      borderRadius: 8,
                      border: '1.5px solid #ddd',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      color: '#888',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                    }}
                  >
                    For Payroll Month
                  </label>
                  <select
                    value={form.for_month}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, for_month: e.target.value }))
                    }
                    style={{
                      display: 'block',
                      width: '100%',
                      marginTop: 4,
                      padding: '9px 10px',
                      borderRadius: 8,
                      border: '1.5px solid #ddd',
                      fontSize: 14,
                      background: '#fff',
                      boxSizing: 'border-box',
                    }}
                  >
                    {forMonthOptions.map((ym) => (
                      <option key={ym} value={ym}>
                        {ymLabel(ym)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {form.payment_date &&
                form.for_month &&
                form.payment_date.slice(0, 7) < form.for_month && (
                  <div
                    style={{
                      marginTop: 10,
                      background: '#fff8e6',
                      border: '1.5px solid #f0c040',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 12,
                      color: '#7a5c00',
                      fontWeight: 500,
                    }}
                  >
                    ⚡ This will be recorded as an{' '}
                    <strong>advance payment</strong> toward{' '}
                    {ymLabel(form.for_month)}.
                  </div>
                )}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  marginTop: 10,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      color: '#888',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                    }}
                  >
                    Paid by
                  </label>
                  <select
                    value={form.paid_by}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, paid_by: e.target.value }))
                    }
                    style={{
                      display: 'block',
                      width: '100%',
                      marginTop: 4,
                      padding: '9px 10px',
                      borderRadius: 8,
                      border: '1.5px solid #ddd',
                      fontSize: 14,
                      background: '#fff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="Alya">Alya</option>
                    <option value="Nina">Nina</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      color: '#888',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                    }}
                  >
                    Amount (RM)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 200"
                    value={form.amount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, amount: e.target.value }))
                    }
                    style={{
                      display: 'block',
                      width: '100%',
                      marginTop: 4,
                      padding: '9px 10px',
                      borderRadius: 8,
                      border: '1.5px solid #ddd',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <label
                  style={{
                    fontSize: 11,
                    color: '#888',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                  }}
                >
                  Note (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Advance, Bonus, Mid-month"
                  value={form.note}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, note: e.target.value }))
                  }
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: 4,
                    padding: '9px 10px',
                    borderRadius: 8,
                    border: '1.5px solid #ddd',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button
                  onClick={handleSave}
                  disabled={
                    saving || !form.amount || parseFloat(form.amount) <= 0
                  }
                  style={{
                    flex: 1,
                    background: '#1a1a2e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity:
                      saving || !form.amount || parseFloat(form.amount) <= 0
                        ? 0.5
                        : 1,
                  }}
                >
                  {saving
                    ? 'Saving…'
                    : editId
                    ? 'Save Changes'
                    : 'Record Payment'}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditId(null);
                  }}
                  style={{
                    padding: '10px 16px',
                    background: '#f0eef5',
                    color: '#555',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {monthPayments.length === 0 ? (
            <div
              style={{
                background: '#fff',
                borderRadius: 14,
                padding: '32px 18px',
                textAlign: 'center',
                color: '#aaa',
                fontSize: 14,
              }}
            >
              No payments recorded for {ymLabel(viewMonth)}.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {monthPayments.map((entry) => {
                const isAlya = entry.paid_by === 'Alya';
                const color = isAlya ? alyaColor : ninaColor;
                const adv = isAdvance(entry);
                const [, pm, pd] = entry.payment_date.split('-');
                return (
                  <div
                    key={entry.id}
                    style={{
                      background: '#fff',
                      borderRadius: 12,
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                      borderLeft: `3px solid ${color}`,
                    }}
                  >
                    <div
                      style={{
                        background: isAlya ? alyaBg : ninaBg,
                        borderRadius: 8,
                        padding: '6px 10px',
                        textAlign: 'center',
                        minWidth: 38,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color,
                          lineHeight: 1,
                        }}
                      >
                        {pd}
                      </div>
                      <div
                        style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}
                      >
                        {MONTHS[parseInt(pm) - 1].slice(0, 3).toUpperCase()}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700, color }}>
                          {entry.paid_by}
                        </span>
                        {adv && (
                          <span
                            style={{
                              fontSize: 10,
                              background: '#fff8e6',
                              color: '#b8860b',
                              border: '1px solid #f0c040',
                              borderRadius: 4,
                              padding: '1px 5px',
                              fontWeight: 600,
                            }}
                          >
                            ADVANCE
                          </span>
                        )}
                        {entry.note ? (
                          <span style={{ fontSize: 12, color: '#999' }}>
                            · {entry.note}
                          </span>
                        ) : null}
                      </div>
                      <div
                        style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}
                      >
                        for {ymLabel(entry.for_month)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: '#1a1a2e',
                        }}
                      >
                        RM{parseFloat(entry.amount).toFixed(0)}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 6,
                          marginTop: 4,
                          justifyContent: 'flex-end',
                        }}
                      >
                        <button
                          onClick={() => handleEdit(entry)}
                          style={{
                            fontSize: 11,
                            color: '#7c5cbf',
                            background: '#ede9f5',
                            border: 'none',
                            borderRadius: 5,
                            padding: '3px 8px',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          style={{
                            fontSize: 11,
                            color: '#e06b9a',
                            background: '#fae8f0',
                            border: 'none',
                            borderRadius: 5,
                            padding: '3px 8px',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          Del
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
