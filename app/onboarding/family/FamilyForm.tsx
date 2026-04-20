"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/Card"
import { FAMILY_TYPE_OPTIONS, type FamilyType } from "@/types"

interface Props {
  familyType: FamilyType | null
  coParentEmail: string
  partnerName: string
}

export function FamilyForm({ familyType }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<FamilyType | null>(familyType)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) { setError("Please choose a family type"); return }

    setLoading(true)
    setServerError("")
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ family_type: selected, onboarding_step: 3 }),
      })
      if (res.ok) { router.push("/onboarding/kids") }
      else { setServerError("Something went wrong. Please try again."); setLoading(false) }
    } catch {
      setServerError("Network error. Please try again.")
      setLoading(false)
    }
  }

  return (
    <Card className="fade-up">
      <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.25rem" }}>
        Family Type
      </h2>
      <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: "1.5rem", lineHeight: 1.5 }}>
        Help us tailor Famco to your family's situation.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
          {FAMILY_TYPE_OPTIONS.map((opt) => {
            const isActive = selected === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setSelected(opt.value); setError("") }}
                style={{
                  padding: "0.875rem",
                  borderRadius: "14px",
                  border: isActive ? "2px solid var(--accent)" : "2px solid var(--border)",
                  background: isActive ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.02)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ fontSize: "1.4rem", marginBottom: "0.3rem" }}>{opt.icon}</div>
                <p style={{
                  fontSize: "0.8rem", fontWeight: 600,
                  color: isActive ? "var(--accent)" : "var(--text)",
                  marginBottom: "0.15rem", fontFamily: "'Outfit',sans-serif",
                }}>
                  {opt.label}
                </p>
                <p style={{ fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.4 }}>
                  {opt.description}
                </p>
              </button>
            )
          })}
        </div>

        {error && <p style={{ color: "#f87171", fontSize: "0.8rem" }}>{error}</p>}
        {serverError && <p style={{ color: "#f87171", fontSize: "0.8rem" }}>{serverError}</p>}

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
          <button
            type="button"
            onClick={() => router.push("/onboarding/location")}
            style={{
              flex: 1, padding: "0.7rem", borderRadius: "10px",
              background: "none", border: "1px solid var(--border)",
              color: "var(--muted)", fontSize: "0.85rem", cursor: "pointer",
              fontFamily: "'Inter',sans-serif",
            }}
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={loading || !selected}
            style={{
              flex: 2, padding: "0.7rem", borderRadius: "10px",
              background: !selected || loading ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg,#6366f1,#c084fc)",
              border: "none", color: "white", fontSize: "0.85rem",
              fontWeight: 600, cursor: !selected || loading ? "not-allowed" : "pointer",
              fontFamily: "'Inter',sans-serif",
            }}
          >
            {loading ? "Saving…" : "Continue →"}
          </button>
        </div>
      </form>
    </Card>
  )
}
