"use client"
import { useEffect, useState } from "react"
import type { ScannedEventRow, ExpenseRow } from "../types"
import { todayStr, addDays } from "../lib/date"
import { EVENT_TYPE_ICON, EVENT_TYPE_LABEL } from "../lib/events"
import { fieldLabelStyle, inputSt, sectionCard } from "../styles"

const EXPENSE_CATEGORIES = ["Food & Dining", "Groceries", "Transport", "School", "Activities", "Medical", "Utilities", "Entertainment", "Subscriptions", "Shopping", "Other"]

const CAT_COLOR: Record<string, string> = {
  "Food & Dining": "#f472b6",
  "Groceries": "#34d399",
  "Transport": "#60a5fa",
  "School": "#818cf8",
  "Activities": "#fbbf24",
  "Medical": "#a78bfa",
  "Utilities": "#f87171",
  "Entertainment": "#fb923c",
  "Subscriptions": "#6ee7b7",
  "Shopping": "#e879f9",
  "Other": "#6b7280",
}

function formatAmount(value: number) {
  return `$${value.toFixed(2)}`
}

function ExpenseCard({ e, color, onDelete, canManageExpenses }: { e: ExpenseRow; color: string; onDelete: (id: string) => void; canManageExpenses: boolean }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
      <div onClick={() => setExpanded((v) => !v)} style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.75rem 1rem", cursor: "pointer" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{e.title}</div>
          <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.1rem" }}>📅 {e.expense_date} · <span style={{ color }}>{e.category ?? "Other"}</span></div>
        </div>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: "#f87171", flexShrink: 0 }}>{formatAmount(Number(e.amount))}</div>
        <span style={{ fontSize: "0.6rem", color: "var(--muted)", opacity: 0.4, marginLeft: "0.25rem" }}>{expanded ? "▲" : "▼"}</span>
        {canManageExpenses && (
          <button onClick={(event) => { event.stopPropagation(); onDelete(e.id) }} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.1rem", cursor: "pointer", padding: "0 0.2rem", lineHeight: 1 }}>×</button>
        )}
      </div>
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "0.625rem 1rem", display: "flex", gap: "1.5rem", flexWrap: "wrap", fontSize: "0.75rem", color: "var(--muted)", background: "rgba(255,255,255,0.02)" }}>
          <span>📅 <strong style={{ color: "var(--text)" }}>{e.expense_date}</strong></span>
          <span>💵 <strong style={{ color: "#f87171" }}>{formatAmount(Number(e.amount))}</strong></span>
          <span style={{ color }}>📂 {e.category ?? "Other"}</span>
          {e.notes && <span>📝 {e.notes}</span>}
        </div>
      )}
    </div>
  )
}

function EmailSubRow({ e }: { e: ScannedEventRow }) {
  const [expanded, setExpanded] = useState(false)
  const name = e.vendor ?? e.organization_name ?? e.title
  const dateStr = e.event_date ? String(e.event_date).slice(0, 10) : null
  const freq = e.recurrence === "monthly" ? "/mo" : e.recurrence === "annual" ? "/yr" : e.recurrence === "weekly" ? "/wk" : ""
  return (
    <div onClick={() => setExpanded((v) => !v)} style={{ cursor: "pointer", background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "10px", padding: "0.625rem 1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
        <span style={{ fontSize: "0.875rem" }}>{EVENT_TYPE_ICON[e.event_type] ?? "💳"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{name}</div>
          {dateStr && <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.1rem" }}>{dateStr}</div>}
        </div>
        {e.amount != null && (
          <div style={{ fontWeight: 700, color: "#818cf8", fontSize: "0.9rem", flexShrink: 0 }}>{formatAmount(Number(e.amount))}{freq}</div>
        )}
        <span style={{ fontSize: "0.6rem", color: "var(--muted)", opacity: 0.5 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div style={{ marginTop: "0.5rem", borderTop: "1px solid rgba(99,102,241,0.12)", paddingTop: "0.5rem", fontSize: "0.75rem", color: "var(--muted)" }}>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
            {dateStr && <span>📅 <strong style={{ color: "var(--text)" }}>{dateStr}</strong></span>}
            {e.amount != null && <span>💵 <strong style={{ color: "#818cf8" }}>{formatAmount(Number(e.amount))}{freq}</strong></span>}
            <span>📂 <strong style={{ color: "var(--text)" }}>{EVENT_TYPE_LABEL[e.event_type] ?? e.event_type}</strong></span>
          </div>
          {e.snippet && <p style={{ opacity: 0.75, lineHeight: 1.5 }}>{e.snippet.slice(0, 250)}</p>}
        </div>
      )}
    </div>
  )
}

interface Props {
  scannedEvents: ScannedEventRow[]
  canManageExpenses?: boolean
}

export function ExpensesTab({ scannedEvents, canManageExpenses = true }: Props) {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newAmount, setNewAmount] = useState("")
  const [newCategory, setNewCategory] = useState("Other")
  const [newDate, setNewDate] = useState(todayStr())
  const [newNotes, setNewNotes] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/expenses")
      .then((response) => response.json())
      .then((data) => { setExpenses(data.expenses ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function addExpense() {
    if (!canManageExpenses || !newTitle.trim() || !newAmount) return
    setSaving(true)
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), amount: parseFloat(newAmount), category: newCategory, expense_date: newDate, notes: newNotes.trim() || null }),
    })
    if (res.ok) {
      const { expense } = await res.json()
      setExpenses((prev) => [expense, ...prev])
      setNewTitle("")
      setNewAmount("")
      setNewCategory("Other")
      setNewDate(todayStr())
      setNewNotes("")
      setShowAdd(false)
    }
    setSaving(false)
  }

  async function deleteExpense(id: string) {
    if (!canManageExpenses) return
    await fetch(`/api/expenses/${id}`, { method: "DELETE" })
    setExpenses((prev) => prev.filter((expense) => expense.id !== id))
  }

  const today = todayStr()
  const weekAgo = addDays(today, -7)
  const monthAgo = addDays(today, -30)
  const twoWeeksAhead = addDays(today, 14)

  const emailSubs = scannedEvents.filter((event) => event.event_type === "subscription" || event.event_type === "invoice" || event.event_type === "bill")
  const monthlyFromEmail = emailSubs.filter((event) => event.recurrence === "monthly").reduce((sum, event) => sum + Number(event.amount ?? 0), 0)
  const annualFromEmail = emailSubs.filter((event) => event.recurrence === "annual").reduce((sum, event) => sum + Number(event.amount ?? 0), 0)
  const dueSoonFromEmail = emailSubs.filter((event) => {
    const date = event.event_date ? String(event.event_date).slice(0, 10) : null
    return !!date && date >= today && date <= twoWeeksAhead
  })

  const groupedRecurringVendors = new Map<string, { name: string; monthlyEquivalent: number; annualEquivalent: number; items: ScannedEventRow[] }>()
  for (const event of emailSubs) {
    const name = event.vendor ?? event.organization_name ?? event.title
    const existing = groupedRecurringVendors.get(name) ?? { name, monthlyEquivalent: 0, annualEquivalent: 0, items: [] }
    const amount = Number(event.amount ?? 0)
    if (event.recurrence === "monthly") existing.monthlyEquivalent += amount
    if (event.recurrence === "annual") existing.annualEquivalent += amount
    existing.items.push(event)
    groupedRecurringVendors.set(name, existing)
  }
  const recurringVendors = [...groupedRecurringVendors.values()].sort(
    (left, right) => (right.monthlyEquivalent + right.annualEquivalent / 12) - (left.monthlyEquivalent + left.annualEquivalent / 12),
  )

  const manualTodayTotal = expenses.filter((expense) => expense.expense_date === today).reduce((sum, expense) => sum + expense.amount, 0)
  const manualWeekTotal = expenses.filter((expense) => expense.expense_date >= weekAgo).reduce((sum, expense) => sum + expense.amount, 0)
  const manualMonthTotal = expenses.filter((expense) => expense.expense_date >= monthAgo).reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Outfit',sans-serif", marginBottom: "0.25rem" }}>💰 Expenses</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Auto-detected from your email inbox · plus anything you track manually</p>
      </div>

      {showAdd && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div onClick={() => setShowAdd(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "relative", background: "rgba(255,255,255,0.99)", border: "1px solid rgba(248,113,113,0.4)", borderRadius: "20px", padding: "1.75rem", width: "100%", maxWidth: "440px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h3 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: "1.15rem" }}>💰 Add Expense</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <div>
                <label style={fieldLabelStyle}>Description *</label>
                <input autoFocus placeholder="e.g. Groceries, Piano lesson fee…" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} style={{ ...inputSt, marginTop: "0.3rem" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={fieldLabelStyle}>Amount ($) *</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00" value={newAmount} onChange={(event) => setNewAmount(event.target.value)} style={{ ...inputSt, marginTop: "0.3rem" }} />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Date *</label>
                  <input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} style={{ ...inputSt, marginTop: "0.3rem", colorScheme: "dark" }} />
                </div>
              </div>
              <div>
                <label style={fieldLabelStyle}>Category</label>
                <select value={newCategory} onChange={(event) => setNewCategory(event.target.value)} style={{ ...inputSt, marginTop: "0.3rem", cursor: "pointer" }}>
                  {EXPENSE_CATEGORIES.map((categoryName) => <option key={categoryName} value={categoryName}>{categoryName}</option>)}
                </select>
              </div>
              <div>
                <label style={fieldLabelStyle}>Notes (optional)</label>
                <input placeholder="e.g. Receipt #1234, reimbursable…" value={newNotes} onChange={(event) => setNewNotes(event.target.value)} style={{ ...inputSt, marginTop: "0.3rem" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.625rem", marginTop: "1.5rem" }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: "0.75rem", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.875rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Cancel</button>
              <button onClick={addExpense} disabled={saving || !newTitle.trim() || !newAmount} style={{ flex: 2, padding: "0.75rem", borderRadius: "10px", background: saving || !newTitle.trim() || !newAmount ? "rgba(248,113,113,0.3)" : "linear-gradient(135deg,#f87171,#ef4444)", border: "none", color: "white", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                {saving ? "Saving…" : "Add Expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <button onClick={() => setShowAdd(true)} disabled={!canManageExpenses} style={{ background: "linear-gradient(135deg,#f87171,#ef4444)", border: "none", borderRadius: "8px", padding: "0.45rem 1rem", color: "white", fontSize: "0.78rem", fontWeight: 600, cursor: canManageExpenses ? "pointer" : "not-allowed", fontFamily: "'Inter',sans-serif", opacity: canManageExpenses ? 1 : 0.55 }}>+ Add Expense</button>
      </div>

      {!canManageExpenses && (
        <div style={{ ...sectionCard, marginBottom: "1rem", padding: "0.9rem 1rem", color: "var(--muted)", fontSize: "0.76rem", lineHeight: 1.55 }}>
          You can review household spending, but only adults, co-parents, or the owner can add or remove manual expenses.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
        {[
          { label: "Today", value: manualTodayTotal, icon: "☀️", color: "#34d399" },
          { label: "This Week", value: manualWeekTotal, icon: "📅", color: "#60a5fa" },
          { label: "Last 30 Days", value: manualMonthTotal, icon: "📊", color: "#818cf8" },
          ...(monthlyFromEmail > 0 ? [{ label: "Email Subs/mo", value: monthlyFromEmail, icon: "💳", color: "#fbbf24" }] : []),
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ background: `${color}0d`, border: `1px solid ${color}33`, borderRadius: "14px", padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>{icon}</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color, fontFamily: "'Outfit',sans-serif" }}>{formatAmount(value)}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.15rem" }}>{label}</div>
          </div>
        ))}
      </div>

      {emailSubs.length > 0 && (
        <div style={{ ...sectionCard, marginBottom: "1.25rem", padding: "1rem 1.1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "0.75rem" }}>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>Recurring monthly</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#818cf8" }}>{formatAmount(monthlyFromEmail)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>Recurring annual</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#a78bfa" }}>{formatAmount(annualFromEmail)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>Due in 14 days</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f59e0b" }}>{dueSoonFromEmail.length}</div>
            </div>
          </div>
          <div style={{ fontSize: "0.76rem", color: "var(--muted)", marginTop: "0.75rem", lineHeight: 1.55 }}>
            Famco groups bills and subscriptions from your inbox so you can spot recurring services, due-soon charges, and high-cost vendors faster.
          </div>
        </div>
      )}

      {recurringVendors.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem", color: "#818cf8" }}>💳 Recurring services</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "0.75rem" }}>
            {recurringVendors.slice(0, 6).map((vendor) => (
              <div key={vendor.name} style={{ ...sectionCard, padding: "1rem" }}>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.25rem" }}>{vendor.name}</div>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.45rem" }}>
                  {vendor.monthlyEquivalent > 0 && <span style={{ fontSize: "0.72rem", color: "#818cf8", fontWeight: 700 }}>{formatAmount(vendor.monthlyEquivalent)} / mo</span>}
                  {vendor.annualEquivalent > 0 && <span style={{ fontSize: "0.72rem", color: "#a78bfa", fontWeight: 700 }}>{formatAmount(vendor.annualEquivalent)} / yr</span>}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{vendor.items.length} detected email item{vendor.items.length === 1 ? "" : "s"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Loading…</p>
      ) : expenses.length === 0 && emailSubs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "16px", color: "var(--muted)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>💳</div>
          <p style={{ fontWeight: 600, marginBottom: "0.375rem", color: "var(--text)" }}>No financial activity detected yet</p>
          <p style={{ fontSize: "0.82rem", marginBottom: "1.25rem" }}>
            Add expenses manually above, or scan your inbox from <strong style={{ color: "#fbbf24" }}>Insights</strong> to automatically surface invoices, bills, and subscriptions from your Gmail.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap", fontSize: "0.75rem", color: "var(--muted)", opacity: 0.7 }}>
            {["Amazon orders", "Apple receipts", "Netflix", "Rogers/Shaw bills", "Online invoices"].map((sample) => (
              <span key={sample} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.2rem 0.5rem" }}>{sample}</span>
            ))}
          </div>
        </div>
      ) : expenses.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {expenses.map((expense) => {
            const color = CAT_COLOR[expense.category ?? "Other"] ?? "#6b7280"
            return <ExpenseCard key={expense.id} e={expense} color={color} onDelete={deleteExpense} canManageExpenses={canManageExpenses} />
          })}
        </div>
      ) : null}

      {dueSoonFromEmail.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem", color: "#f59e0b" }}>⏳ Due soon from email</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {dueSoonFromEmail.slice(0, 6).map((event) => <EmailSubRow key={event.id} e={event} />)}
          </div>
        </div>
      )}

      {emailSubs.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem", color: "#818cf8" }}>💳 Detected from Email</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {emailSubs.map((event) => <EmailSubRow key={event.id} e={event} />)}
          </div>
        </div>
      )}
    </>
  )
}
