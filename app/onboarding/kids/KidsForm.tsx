"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

interface KidRow {
  firstName: string
  lastName: string
  dob: string
}

interface Props {
  initialKids: KidRow[]
}

const emptyKid = (): KidRow => ({ firstName: "", lastName: "", dob: "" })

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
  borderRadius: "999px",
  padding: "0.3rem 0.65rem",
  background: "rgba(52,211,153,0.14)",
  color: "#047857",
  fontSize: "0.72rem",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
}

const dateFieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.9rem 1rem",
  borderRadius: "16px",
  background: "#fcfcff",
  border: "1px solid rgba(99,102,241,0.14)",
  color: "var(--text)",
  fontSize: "0.92rem",
  fontFamily: "'Inter',sans-serif",
  outline: "none",
  boxSizing: "border-box",
  boxShadow: "inset 0 1px 2px rgba(15,23,42,0.04)",
  colorScheme: "light",
}

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.45rem",
  minWidth: "120px",
  padding: "0.82rem 1.05rem",
  borderRadius: "16px",
  border: "1px solid rgba(99,102,241,0.18)",
  background: "rgba(255,255,255,0.94)",
  color: "#4f46e5",
  fontSize: "0.84rem",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'Outfit', sans-serif",
  boxShadow: "0 10px 24px rgba(15,23,42,0.04)",
}

const addChildButtonStyle: React.CSSProperties = {
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.55rem",
  padding: "0.9rem 1rem",
  borderRadius: "18px",
  border: "1px dashed rgba(99,102,241,0.26)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,247,255,0.92))",
  color: "#4f46e5",
  fontSize: "0.85rem",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'Outfit', sans-serif",
  boxShadow: "0 12px 28px rgba(99,102,241,0.06)",
}

export function KidsForm({ initialKids }: Props) {
  const router = useRouter()
  const [kids, setKids] = useState<KidRow[]>(initialKids.length > 0 ? initialKids : [])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")

  function updateKid(index: number, field: keyof KidRow, value: string) {
    setKids((current) => current.map((kid, kidIndex) => (kidIndex === index ? { ...kid, [field]: value } : kid)))
    setErrors((current) => ({ ...current, [`${field}_${index}`]: "" }))
  }

  function addKid() {
    setKids((current) => [...current, emptyKid()])
  }

  function removeKid(index: number) {
    setKids((current) => current.filter((_, kidIndex) => kidIndex !== index))
  }

  async function finish(kidsToSave: KidRow[]) {
    setLoading(true)
    setServerError("")
    try {
      const res = await fetch("/api/kids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kids: kidsToSave.map((kid) => ({
            name: [kid.firstName.trim(), kid.lastName.trim()].filter(Boolean).join(" "),
            first_name: kid.firstName.trim() || null,
            last_name: kid.lastName.trim() || null,
            dob: kid.dob || null,
          })),
        }),
      })
      if (res.ok) {
        router.push("/dashboard")
      } else {
        setServerError("Something went wrong. Please try again.")
        setLoading(false)
      }
    } catch {
      setServerError("Network error. Please try again.")
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors: Record<string, string> = {}

    kids.forEach((kid, index) => {
      if (!kid.firstName.trim()) {
        nextErrors[`firstName_${index}`] = "First name is required"
      }
    })

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    await finish(kids)
  }

  async function handleSkip() {
    await finish([])
  }

  return (
    <Card className="fade-up">
      <div style={badgeStyle}>Children Optional</div>

      <h2
        style={{
          fontSize: "clamp(1.65rem, 3vw, 2.05rem)",
          fontWeight: 800,
          marginTop: "0.9rem",
          marginBottom: "0.45rem",
        }}
      >
        Add anyone you want Famco to recognize
      </h2>
      <p
        style={{
          color: "#5b6475",
          fontSize: "0.92rem",
          marginBottom: "1.6rem",
          lineHeight: 1.7,
          maxWidth: "49ch",
        }}
      >
        You can skip this and head straight to the dashboard, or add children now so Famco can better
        recognize school, activity, and appointment emails from the beginning.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.15rem" }}>
        {kids.length === 0 ? (
          <div
            style={{
              borderRadius: "24px",
              border: "1px dashed rgba(99,102,241,0.22)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(245,247,255,0.84))",
              padding: "1.35rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "18px",
                  background: "rgba(99,102,241,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.4rem",
                  flexShrink: 0,
                }}
              >
                + 
              </div>
              <div style={{ flex: 1, minWidth: "220px" }}>
                <div
                  style={{
                    fontFamily: "'Outfit',sans-serif",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    marginBottom: "0.35rem",
                    color: "#111827",
                  }}
                >
                  Start simple, then build the household later
                </div>
                <div style={{ fontSize: "0.86rem", lineHeight: 1.7, color: "#667085", marginBottom: "1rem" }}>
                  Adding children now improves school and activity matching, but nothing is required here.
                  Manage Family can always fill in the deeper details later.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginBottom: "1rem" }}>
                  {[
                    "Better school email recognition",
                    "More relevant calendar suggestions",
                    "Cleaner member matching in Insights",
                  ].map((item) => (
                    <span
                      key={item}
                      style={{
                        borderRadius: "999px",
                        padding: "0.45rem 0.75rem",
                        background: "rgba(79,70,229,0.08)",
                        color: "#4338ca",
                        fontSize: "0.76rem",
                        fontWeight: 700,
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <button type="button" onClick={addKid} style={addChildButtonStyle}>
                  <span style={{ fontSize: "1rem", lineHeight: 1 }}>+</span>
                  Add a child now
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {kids.map((kid, index) => (
              <div
                key={index}
                style={{
                  borderRadius: "24px",
                  border: "1px solid rgba(99,102,241,0.12)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,255,0.92))",
                  boxShadow: "0 10px 28px rgba(15,23,42,0.04)",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.95rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.8rem", flexWrap: "wrap" }}>
                  <div>
                    <div
                      style={{
                        fontSize: "0.74rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "#6366f1",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Child {index + 1}
                    </div>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: "1rem", color: "#111827" }}>
                      Household member
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeKid(index)}
                    style={{
                      borderRadius: "999px",
                      border: "1px solid rgba(239,68,68,0.18)",
                      background: "rgba(254,242,242,0.9)",
                      color: "#dc2626",
                      padding: "0.45rem 0.8rem",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "'Inter',sans-serif",
                    }}
                  >
                    Remove
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "0.9rem",
                  }}
                >
                  <Input
                    label="First Name"
                    value={kid.firstName}
                    onChange={(e) => updateKid(index, "firstName", e.target.value)}
                    error={errors[`firstName_${index}`]}
                    placeholder="e.g. Emma"
                  />
                  <Input
                    label="Last Name"
                    value={kid.lastName}
                    onChange={(e) => updateKid(index, "lastName", e.target.value)}
                    placeholder="e.g. Johnson"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "#71717a",
                    }}
                  >
                    Birth date <span style={{ textTransform: "none", letterSpacing: "normal", fontWeight: 500 }}>(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={kid.dob}
                    onChange={(e) => updateKid(index, "dob", e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    style={dateFieldStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent)"
                      e.currentTarget.style.boxShadow = "0 0 0 4px rgba(99,102,241,0.14), inset 0 1px 2px rgba(15,23,42,0.04)"
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(99,102,241,0.14)"
                      e.currentTarget.style.boxShadow = "inset 0 1px 2px rgba(15,23,42,0.04)"
                    }}
                  />
                </div>
              </div>
            ))}

            <button type="button" onClick={addKid} style={addChildButtonStyle}>
              <span style={{ fontSize: "1rem", lineHeight: 1 }}>+</span>
              Add another child
            </button>
          </>
        )}

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
          <button type="button" onClick={() => router.push("/onboarding/family")} style={secondaryButtonStyle}>
            ← Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <div style={{ fontSize: "0.76rem", color: "var(--muted)" }}>
              You can always add or edit children later in Manage Family.
            </div>
            {kids.length > 0 ? (
              <Button type="submit" loading={loading}>
                {loading ? "Saving..." : "Finish setup"}
              </Button>
            ) : (
              <Button type="button" loading={loading} onClick={handleSkip}>
                {loading ? "Setting up..." : "Go to dashboard"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Card>
  )
}
