"use client"

import { signOut } from "next-auth/react"
import { useState } from "react"
import type { BillingSummary } from "../types"
import { savePillStyle } from "../styles"

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function StatusCard({
  title,
  value,
  detail,
  tone,
}: {
  title: string
  value: string
  detail: string
  tone: "teal" | "amber" | "rose" | "indigo"
}) {
  const tones = {
    teal: { text: "#14b8a6", bg: "rgba(20,184,166,0.08)", border: "rgba(20,184,166,0.22)" },
    amber: { text: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.22)" },
    rose: { text: "#fb7185", bg: "rgba(251,113,133,0.08)", border: "rgba(251,113,133,0.22)" },
    indigo: { text: "#818cf8", bg: "rgba(129,140,248,0.08)", border: "rgba(129,140,248,0.22)" },
  }[tone]
  return (
    <div style={{ background: tones.bg, border: `1px solid ${tones.border}`, borderRadius: "16px", padding: "1rem 1.1rem" }}>
      <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem" }}>{title}</div>
      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: tones.text, marginBottom: "0.25rem" }}>{value}</div>
      <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5 }}>{detail}</div>
    </div>
  )
}

export function BillingTab({ billing }: { billing: BillingSummary }) {
  const [confirmValue, setConfirmValue] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const statusTone = billing.status === "trial" ? "teal" : billing.status === "grace" ? "amber" : "rose"
  const statusLabel = billing.status === "trial" ? "Free Trial" : billing.status === "grace" ? "Grace Week" : "Expired Preview"
  const statusDetail = billing.status === "trial"
    ? `${billing.daysRemaining} day${billing.daysRemaining === 1 ? "" : "s"} left before paid billing starts.`
    : billing.status === "grace"
      ? `${billing.daysRemaining} day${billing.daysRemaining === 1 ? "" : "s"} left before login cutoff when enforcement is turned on.`
      : "Your preview has crossed the grace window, but payment enforcement is still off while you keep testing."

  async function handleDelete() {
    if (confirmValue !== "DELETE") return
    setDeleting(true)
    setError(null)
    try {
      const response = await fetch("/api/account", { method: "DELETE" })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        setError(typeof body.error === "string" ? body.error : "Unable to delete the account right now.")
        setDeleting(false)
        return
      }
      await signOut({ callbackUrl: "/" })
    } catch {
      setError("Unable to delete the account right now.")
      setDeleting(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Outfit',sans-serif", marginBottom: "0.2rem" }}>Billing</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.6, maxWidth: "780px" }}>
            Every household starts with a free {billing.trialDays}-day trial. After that, Famco is designed to move to a ${billing.monthlyPrice}/month PayPal subscription owned by the primary account holder.
            {" "}
            {!billing.enforcementEnabled && "Payments are still in preview mode while you keep testing, so nothing is blocked yet."}
          </p>
        </div>
        <div style={{ borderRadius: "999px", padding: "0.45rem 0.8rem", background: billing.enforcementEnabled ? "rgba(20,184,166,0.12)" : "rgba(251,191,36,0.12)", color: billing.enforcementEnabled ? "#14b8a6" : "#f59e0b", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase" }}>
          {billing.enforcementEnabled ? "Billing Live" : "Preview Only"}
        </div>
      </div>

      <div style={{ background: billing.enforcementEnabled ? "rgba(20,184,166,0.08)" : "rgba(251,191,36,0.08)", border: `1px solid ${billing.enforcementEnabled ? "rgba(20,184,166,0.22)" : "rgba(251,191,36,0.24)"}`, borderRadius: "18px", padding: "1rem 1.15rem" }}>
        <div style={{ fontSize: "0.88rem", fontWeight: 800, color: billing.enforcementEnabled ? "#14b8a6" : "#f59e0b", marginBottom: "0.3rem" }}>
          {billing.enforcementEnabled ? "Subscription enforcement is active." : "Subscription enforcement is turned off for this testing phase."}
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>
          When billing is enabled, Famco will allow login during the {billing.trialDays}-day trial, stop data sync during the following {billing.graceDays}-day grace window, and then stop login access after that window closes.
          The permanent-deletion timeline below is shown now so you can test the product flow before charging anyone.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "0.9rem" }}>
        <StatusCard title="Plan" value={`$${billing.monthlyPrice}/month`} detail="Recurring household subscription charged through PayPal." tone="indigo" />
        <StatusCard title="Current Status" value={statusLabel} detail={statusDetail} tone={statusTone} />
        <StatusCard title="Trial Ends" value={formatDate(billing.trialEndsAt)} detail="Sync remains available through the end of the trial." tone="teal" />
        <StatusCard title="Access Cutoff" value={formatDate(billing.accessEndsAt)} detail="After the grace window, login can be blocked and household data may be deleted." tone="amber" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1rem" }}>
        <div style={{ background: "#fff", borderRadius: "18px", padding: "1.25rem", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#14b8a6", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.7rem" }}>Primary Billing User</div>
          <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.25rem" }}>{billing.primaryUserName}</div>
          <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "0.8rem" }}>{billing.primaryUserEmail}</div>
          <div style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.6 }}>
            This household owner is responsible for the PayPal subscription and any recurring payments when billing is enabled.
            {!billing.isPrimaryUser && " You can view the plan here, but only the primary user should manage recurring billing for this household."}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "18px", padding: "1.25rem", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0ea5e9", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.7rem" }}>PayPal Gateway</div>
          <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.35rem" }}>Recurring monthly billing through PayPal</div>
          <div style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "1rem" }}>
            Famco is set up to use PayPal as the subscription gateway. Once you are ready to stop test mode, the household owner can activate the recurring ${billing.monthlyPrice}/month plan here.
          </div>
          {billing.paypalSubscribeUrl ? (
            <a
              href={billing.paypalSubscribeUrl}
              target="_blank"
              rel="noreferrer"
              style={{ ...savePillStyle, display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
            >
              Open PayPal Checkout
            </a>
          ) : (
            <button
              type="button"
              disabled
              style={{ ...savePillStyle, opacity: 0.55, cursor: "not-allowed" }}
            >
              PayPal checkout not configured yet
            </button>
          )}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: "18px", padding: "1.25rem", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.7rem" }}>Trial and Access Timeline</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "0.8rem" }}>
          <div style={{ borderRadius: "14px", background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)", padding: "0.95rem" }}>
            <div style={{ fontWeight: 800, color: "#14b8a6", marginBottom: "0.2rem" }}>Days 1-{billing.trialDays}</div>
            <div style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.55 }}>
              Full access and syncing. Trial ends on {formatDateTime(billing.trialEndsAt)}.
            </div>
          </div>
          <div style={{ borderRadius: "14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", padding: "0.95rem" }}>
            <div style={{ fontWeight: 800, color: "#f59e0b", marginBottom: "0.2rem" }}>Grace Week</div>
            <div style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.55 }}>
              Users can still log in for {billing.graceDays} more days, but data syncing is expected to stop when billing enforcement is active.
            </div>
          </div>
          <div style={{ borderRadius: "14px", background: "rgba(251,113,133,0.08)", border: "1px solid rgba(251,113,133,0.2)", padding: "0.95rem" }}>
            <div style={{ fontWeight: 800, color: "#fb7185", marginBottom: "0.2rem" }}>After Grace</div>
            <div style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.55 }}>
              Logins can be blocked after {formatDateTime(billing.accessEndsAt)}, and household data becomes eligible for permanent removal immediately.
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: "rgba(251,113,133,0.06)", border: "1px solid rgba(251,113,133,0.22)", borderRadius: "18px", padding: "1.25rem" }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#fb7185", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.65rem" }}>Danger Zone</div>
        <div style={{ fontSize: "0.82rem", color: "var(--text)", fontWeight: 700, marginBottom: "0.25rem" }}>
          {billing.isPrimaryUser ? "Delete household account immediately" : "Delete your account access immediately"}
        </div>
        <div style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "1rem", maxWidth: "780px" }}>
          {billing.isPrimaryUser
            ? "This deletes the primary Famco account and permanently removes the household data connected to it right away."
            : "This removes your Famco account from the shared household right away. The primary household data remains with the account owner."}
          {" "}There is no undo.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem", maxWidth: "360px" }}>
          <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Type DELETE to confirm
          </label>
          <input
            value={confirmValue}
            onChange={(event) => setConfirmValue(event.target.value)}
            placeholder="DELETE"
            style={{ width: "100%", padding: "0.7rem 0.85rem", borderRadius: "10px", background: "#fff", border: "1px solid rgba(251,113,133,0.35)", color: "var(--text)", fontSize: "0.9rem", fontFamily: "inherit", boxSizing: "border-box" }}
          />
          {error && <div style={{ fontSize: "0.74rem", color: "#ef4444" }}>{error}</div>}
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting || confirmValue !== "DELETE"}
            style={{ ...savePillStyle, background: "linear-gradient(135deg,#fb7185,#ef4444)", opacity: deleting || confirmValue !== "DELETE" ? 0.55 : 1, cursor: deleting || confirmValue !== "DELETE" ? "not-allowed" : "pointer" }}
          >
            {deleting ? "Deleting…" : billing.isPrimaryUser ? "Delete household now" : "Delete my account now"}
          </button>
        </div>
      </div>
    </div>
  )
}
