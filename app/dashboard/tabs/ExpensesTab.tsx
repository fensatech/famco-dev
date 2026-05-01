"use client"
import { useState, useEffect } from "react"
import type { ScannedEventRow, ExpenseRow } from "../types"
import { todayStr, addDays } from "../lib/date"
import { EVENT_TYPE_ICON, EVENT_TYPE_LABEL } from "../lib/events"
import { fieldLabelStyle, inputSt } from "../styles"

const EXPENSE_CATEGORIES = ["Food & Dining","Groceries","Transport","School","Activities","Medical","Utilities","Entertainment","Subscriptions","Shopping","Other"]

const CAT_COLOR: Record<string, string> = {
  "Food & Dining": "#f472b6", "Groceries": "#34d399", "Transport": "#60a5fa",
  "School": "#818cf8", "Activities": "#fbbf24", "Medical": "#a78bfa",
  "Utilities": "#f87171", "Entertainment": "#fb923c", "Subscriptions": "#6ee7b7",
  "Shopping": "#e879f9", "Other": "#6b7280",
}

function ExpenseCard({ e, color, onDelete }: { e: ExpenseRow; color: string; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
      <div onClick={() => setExpanded((v) => !v)} style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.75rem 1rem", cursor: "pointer" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{e.title}</div>
          <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.1rem" }}>📅 {e.expense_date} · <span style={{ color }}>{e.category ?? "Other"}</span></div>
        </div>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: "#f87171", flexShrink: 0 }}>${Number(e.amount).toFixed(2)}</div>
        <span style={{ fontSize: "0.6rem", color: "var(--muted)", opacity: 0.4, marginLeft: "0.25rem" }}>{expanded ? "▲" : "▼"}</span>
        <button onClick={(ev) => { ev.stopPropagation(); onDelete(e.id) }} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.1rem", cursor: "pointer", padding: "0 0.2rem", lineHeight: 1 }}>×</button>
      </div>
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "0.625rem 1rem", display: "flex", gap: "1.5rem", flexWrap: "wrap", fontSize: "0.75rem", color: "var(--muted)", background: "rgba(255,255,255,0.02)" }}>
          <span>📅 <strong style={{ color: "var(--text)" }}>{e.expense_date}</strong></span>
          <span>💵 <strong style={{ color: "#f87171" }}>${Number(e.amount).toFixed(2)}</strong></span>
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
    <div onClick={() => setExpanded((v) => !v)} style={{ cursor: "pointer", background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "10px", padding: "0.625rem 1rem", transition: "background 0.12s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
        <span style={{ fontSize: "0.875rem" }}>{EVENT_TYPE_ICON[e.event_type] ?? "💳"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{name}</div>
          {dateStr && <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.1rem" }}>{dateStr}</div>}
        </div>
        {e.amount != null && (
          <div style={{ fontWeight: 700, color: "#818cf8", fontSize: "0.9rem", flexShrink: 0 }}>${Number(e.amount).toFixed(2)}{freq}</div>
        )}
        <span style={{ fontSize: "0.6rem", color: "var(--muted)", opacity: 0.5 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div style={{ marginTop: "0.5rem", borderTop: "1px solid rgba(99,102,241,0.12)", paddingTop: "0.5rem", fontSize: "0.75rem", color: "var(--muted)" }}>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
            {dateStr && <span>📅 <strong style={{ color: "var(--text)" }}>{dateStr}</strong></span>}
            {e.amount != null && <span>💵 <strong style={{ color: "#818cf8" }}>${Number(e.amount).toFixed(2)}{freq}</strong></span>}
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
}

export function ExpensesTab({ scannedEvents }: Props) {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newAmount, setNewAmount] = useState("")
  const [newCategory, setNewCategory] = useState("Other")
  const [newDate, setNewDate] = useState(todayStr())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/expenses").then(r => r.json()).then(d => { setExpenses(d.expenses ?? []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function addExpense() {
    if (!newTitle.trim() || !newAmount) return
    setSaving(true)
    const res = await fetch("/api/expenses", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), amount: parseFloat(newAmount), category: newCategory, expense_date: newDate }),
    })
    if (res.ok) {
      const { expense } = await res.json()
      setExpenses(prev => [expense, ...prev])
      setNewTitle(""); setNewAmount(""); setNewCategory("Other"); setNewDate(todayStr()); setShowAdd(false)
    }
    setSaving(false)
  }

  async function deleteExpense(id: string) {
    await fetch(`/api/expenses/${id}`, { method: "DELETE" })
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const today = todayStr()
  const weekAgo = addDays(today, -7)
  const monthAgo = addDays(today, -30)

  const todayTotal = expenses.filter(e => e.expense_date === today).reduce((s, e) => s + e.amount, 0)
  const weekTotal = expenses.filter(e => e.expense_date >= weekAgo).reduce((s, e) => s + e.amount, 0)
  const monthTotal = expenses.filter(e => e.expense_date >= monthAgo).reduce((s, e) => s + e.amount, 0)

  const emailSubs = scannedEvents.filter(e => e.event_type === "subscription" || e.event_type === "invoice" || e.event_type === "bill")
  const monthlyFromEmail = emailSubs.filter(e => e.recurrence === "monthly").reduce((s, e) => s + Number(e.amount ?? 0), 0)

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
                <input autoFocus placeholder="e.g. Groceries, Piano lesson fee…" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ ...inputSt, marginTop: "0.3rem" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={fieldLabelStyle}>Amount ($) *</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00" value={newAmount} onChange={e => setNewAmount(e.target.value)} style={{ ...inputSt, marginTop: "0.3rem" }} />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Date *</label>
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ ...inputSt, marginTop: "0.3rem", colorScheme: "dark" }} />
                </div>
              </div>
              <div>
                <label style={fieldLabelStyle}>Category</label>
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ ...inputSt, marginTop: "0.3rem", cursor: "pointer" }}>
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
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
        <button onClick={() => setShowAdd(true)} style={{ background: "linear-gradient(135deg,#f87171,#ef4444)", border: "none", borderRadius: "8px", padding: "0.45rem 1rem", color: "white", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>+ Add Expense</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "0.75rem", marginBottom: "1.75rem" }}>
        {[
          { label: "Today", value: todayTotal, icon: "☀️", color: "#34d399" },
          { label: "This Week", value: weekTotal, icon: "📅", color: "#60a5fa" },
          { label: "Last 30 Days", value: monthTotal, icon: "📊", color: "#818cf8" },
          ...(monthlyFromEmail > 0 ? [{ label: "Email Subs/mo", value: monthlyFromEmail, icon: "💳", color: "#fbbf24" }] : []),
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ background: `${color}0d`, border: `1px solid ${color}33`, borderRadius: "14px", padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>{icon}</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color, fontFamily: "'Outfit',sans-serif" }}>${value.toFixed(2)}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.15rem" }}>{label}</div>
          </div>
        ))}
      </div>

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
            {["Amazon orders", "Apple receipts", "Netflix", "Rogers/Shaw bills", "Online invoices"].map(s => (
              <span key={s} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.2rem 0.5rem" }}>{s}</span>
            ))}
          </div>
        </div>
      ) : expenses.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {expenses.map(e => {
            const color = CAT_COLOR[e.category ?? "Other"] ?? "#6b7280"
            return <ExpenseCard key={e.id} e={e} color={color} onDelete={deleteExpense} />
          })}
        </div>
      ) : null}

      {emailSubs.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem", color: "#818cf8" }}>💳 Detected from Email</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {emailSubs.map(e => <EmailSubRow key={e.id} e={e} />)}
          </div>
        </div>
      )}
    </>
  )
}
