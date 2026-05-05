"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { FAMILY_TYPE_OPTIONS, type FamilyType } from "@/types"

interface Props {
  familyType: FamilyType | null
  coParentEmail: string
  partnerName: string
}

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
  borderRadius: "999px",
  padding: "0.3rem 0.65rem",
  background: "rgba(250,204,21,0.16)",
  color: "#a16207",
  fontSize: "0.72rem",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
}

export function FamilyForm({ familyType }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<FamilyType | null>(familyType)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setServerError("")
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ family_type: selected ?? null, onboarding_step: 3 }),
      })
      if (res.ok) {
        router.push("/onboarding/kids")
      } else {
        setServerError("Something went wrong. Please try again.")
        setLoading(false)
      }
    } catch {
      setServerError("Network error. Please try again.")
      setLoading(false)
    }
  }

  return (
    <Card className="fade-up">
      <div style={badgeStyle}>Household</div>

      <h2
        style={{
          fontSize: "clamp(1.65rem, 3vw, 2.05rem)",
          fontWeight: 800,
          marginTop: "0.9rem",
          marginBottom: "0.45rem",
        }}
      >
        Which setup feels closest to home?
      </h2>
      <p
        style={{
          color: "#5b6475",
          fontSize: "0.92rem",
          marginBottom: "1.6rem",
          lineHeight: 1.7,
          maxWidth: "48ch",
        }}
      >
        This step is optional, but it helps Famco understand how to organize your household context,
        calendar, and shared planning. You can always change it later in Manage Family.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.9rem",
          }}
        >
          {FAMILY_TYPE_OPTIONS.map((option) => {
            const isActive = selected === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelected(isActive ? null : option.value)}
                style={{
                  padding: "1rem",
                  borderRadius: "22px",
                  border: isActive
                    ? "1px solid rgba(99,102,241,0.34)"
                    : "1px solid rgba(99,102,241,0.12)",
                  background: isActive
                    ? "linear-gradient(180deg, rgba(238,242,255,0.98), rgba(224,231,255,0.92))"
                    : "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(250,251,255,0.9))",
                  boxShadow: isActive
                    ? "0 18px 36px rgba(99,102,241,0.16)"
                    : "0 8px 20px rgba(15,23,42,0.04)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.24s ease",
                  position: "relative",
                  minHeight: "154px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      width: "46px",
                      height: "46px",
                      borderRadius: "16px",
                      background: isActive ? "rgba(79,70,229,0.12)" : "rgba(148,163,184,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.25rem",
                    }}
                  >
                    {option.icon}
                  </div>
                  <div
                    style={{
                      minWidth: "22px",
                      height: "22px",
                      borderRadius: "999px",
                      background: isActive ? "#4f46e5" : "transparent",
                      border: isActive ? "none" : "1px solid rgba(99,102,241,0.18)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {isActive ? "✓" : ""}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontFamily: "'Outfit',sans-serif",
                      fontWeight: 700,
                      fontSize: "1rem",
                      color: isActive ? "#312e81" : "#111827",
                      marginBottom: "0.35rem",
                    }}
                  >
                    {option.label}
                  </div>
                  <div
                    style={{
                      fontSize: "0.84rem",
                      lineHeight: 1.6,
                      color: "#667085",
                    }}
                  >
                    {option.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div
          style={{
            borderRadius: "18px",
            background: "rgba(248,250,252,0.88)",
            border: "1px solid rgba(99,102,241,0.1)",
            padding: "0.95rem 1rem",
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#312e81", marginBottom: "0.2rem" }}>
              Optional step
            </div>
            <div style={{ fontSize: "0.8rem", lineHeight: 1.6, color: "#667085" }}>
              No pressure to decide this perfectly now. A quick best-fit answer is enough to personalize your
              setup.
            </div>
          </div>
          <div
            style={{
              alignSelf: "center",
              borderRadius: "999px",
              padding: "0.45rem 0.75rem",
              background: selected ? "rgba(79,70,229,0.08)" : "rgba(148,163,184,0.1)",
              color: selected ? "#4338ca" : "#6b7280",
              fontSize: "0.76rem",
              fontWeight: 700,
            }}
          >
            {selected ? "Selected: " + FAMILY_TYPE_OPTIONS.find((item) => item.value === selected)?.label : "You can continue without choosing"}
          </div>
        </div>

        {serverError && <p style={{ color: "#f87171", fontSize: "0.8rem" }}>{serverError}</p>}

        <div
          style={{
            marginTop: "0.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.85rem",
            flexWrap: "wrap",
          }}
        >
          <Button type="button" variant="outline" onClick={() => router.push("/onboarding/location")}>
            Back
          </Button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <div style={{ fontSize: "0.76rem", color: "var(--muted)" }}>
              This helps Famco tune calendar and household context.
            </div>
            <Button type="submit" loading={loading}>
              {loading ? "Saving..." : "Continue"}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  )
}
