import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { isAdminEmail } from "@/lib/admin"
import { ensureRuntimeSchema, getAdminHouseholdOverview } from "@/lib/db"

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function toneForStatus(status: "trial" | "grace" | "expired") {
  if (status === "trial") return { color: "#14b8a6", bg: "rgba(20,184,166,0.08)", border: "rgba(20,184,166,0.2)" }
  if (status === "grace") return { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.22)" }
  return { color: "#fb7185", bg: "rgba(251,113,133,0.08)", border: "rgba(251,113,133,0.22)" }
}

export default async function AdminPage() {
  const session = await auth()
  const sessionEmail = session?.user?.email ?? null
  if (!sessionEmail || !isAdminEmail(sessionEmail)) {
    redirect("/dashboard")
  }

  await ensureRuntimeSchema().catch(() => {})
  const households = await getAdminHouseholdOverview()

  const totalHouseholds = households.length
  const totalMembers = households.reduce((sum, household) => sum + household.member_count, 0)
  const totalDocuments = households.reduce((sum, household) => sum + household.document_count, 0)
  const pendingInvites = households.reduce((sum, household) => sum + household.pending_invites, 0)

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(180deg,#f7f8fc 0%,#eef2ff 100%)", padding: "2rem 1.5rem 3rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.35rem" }}>
              Famco Admin
            </div>
            <h1 style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.04em", color: "#111827", marginBottom: "0.35rem" }}>
              Household Overview
            </h1>
            <p style={{ color: "#6b7280", fontSize: "0.92rem", lineHeight: 1.6, maxWidth: "760px" }}>
              Internal admin view for household health, shared-member growth, trial status, and support triage. This stays separate from the family-facing portal.
            </p>
          </div>
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.7rem 1rem",
              borderRadius: "999px",
              border: "1px solid rgba(99,102,241,0.18)",
              background: "rgba(99,102,241,0.08)",
              color: "#4f46e5",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "0.82rem",
            }}
          >
            Back to dashboard
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "0.9rem", marginBottom: "1.25rem" }}>
          {[
            { label: "Households", value: totalHouseholds, color: "#6366f1" },
            { label: "Active members", value: totalMembers, color: "#14b8a6" },
            { label: "Pending invites", value: pendingInvites, color: "#f59e0b" },
            { label: "Stored documents", value: totalDocuments, color: "#3b82f6" },
          ].map((card) => (
            <div key={card.label} style={{ background: "#fff", borderRadius: "20px", border: "1px solid rgba(15,23,42,0.06)", padding: "1.15rem 1.2rem", boxShadow: "0 12px 32px rgba(15,23,42,0.06)" }}>
              <div style={{ fontSize: "0.74rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.35rem" }}>
                {card.label}
              </div>
              <div style={{ fontSize: "1.7rem", fontWeight: 900, color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: "24px", border: "1px solid rgba(15,23,42,0.06)", boxShadow: "0 18px 48px rgba(15,23,42,0.08)", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.2rem", borderBottom: "1px solid rgba(15,23,42,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#111827" }}>Family households</div>
              <div style={{ fontSize: "0.76rem", color: "#6b7280", marginTop: "0.15rem" }}>
                Primary household owner, shared-member growth, trial status, and content volume.
              </div>
            </div>
            <div style={{ fontSize: "0.74rem", color: "#6b7280" }}>
              {totalHouseholds} household{totalHouseholds === 1 ? "" : "s"}
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "980px" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Primary user", "Trial status", "Family type", "Members", "Kids", "Pets", "Pending invites", "Documents", "Scanned emails", "Created"].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        textAlign: "left",
                        padding: "0.85rem 1rem",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        letterSpacing: "0.05em",
                        color: "#6b7280",
                        textTransform: "uppercase",
                        borderBottom: "1px solid rgba(15,23,42,0.06)",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {households.map((household) => {
                  const tone = toneForStatus(household.billing_status)
                  return (
                    <tr key={household.household_root_id}>
                      <td style={{ padding: "0.9rem 1rem", borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
                        <div style={{ fontWeight: 800, color: "#111827", marginBottom: "0.15rem" }}>{household.primary_name}</div>
                        <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>{household.primary_email}</div>
                      </td>
                      <td style={{ padding: "0.9rem 1rem", borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.22rem 0.55rem",
                            borderRadius: "999px",
                            background: tone.bg,
                            color: tone.color,
                            border: `1px solid ${tone.border}`,
                            fontWeight: 800,
                            fontSize: "0.72rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {household.billing_status}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: "0.35rem" }}>
                          Trial started {formatDate(household.trial_started_at)}
                        </div>
                      </td>
                      <td style={{ padding: "0.9rem 1rem", borderBottom: "1px solid rgba(15,23,42,0.06)", color: "#374151", fontSize: "0.8rem" }}>
                        {household.family_type ? household.family_type.replace(/_/g, " ") : "Not set"}
                      </td>
                      <td style={{ padding: "0.9rem 1rem", borderBottom: "1px solid rgba(15,23,42,0.06)", fontWeight: 700, color: "#111827" }}>{household.member_count}</td>
                      <td style={{ padding: "0.9rem 1rem", borderBottom: "1px solid rgba(15,23,42,0.06)", color: "#374151" }}>{household.kid_count}</td>
                      <td style={{ padding: "0.9rem 1rem", borderBottom: "1px solid rgba(15,23,42,0.06)", color: "#374151" }}>{household.pet_count}</td>
                      <td style={{ padding: "0.9rem 1rem", borderBottom: "1px solid rgba(15,23,42,0.06)", color: household.pending_invites > 0 ? "#f59e0b" : "#374151", fontWeight: household.pending_invites > 0 ? 800 : 500 }}>
                        {household.pending_invites}
                      </td>
                      <td style={{ padding: "0.9rem 1rem", borderBottom: "1px solid rgba(15,23,42,0.06)", color: "#374151" }}>{household.document_count}</td>
                      <td style={{ padding: "0.9rem 1rem", borderBottom: "1px solid rgba(15,23,42,0.06)", color: "#374151" }}>{household.scanned_event_count}</td>
                      <td style={{ padding: "0.9rem 1rem", borderBottom: "1px solid rgba(15,23,42,0.06)", color: "#6b7280", fontSize: "0.78rem" }}>
                        {formatDate(household.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}
