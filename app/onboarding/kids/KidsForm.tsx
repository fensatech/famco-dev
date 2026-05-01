"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"

interface KidRow {
  name: string
  dob: string
}

interface Props {
  initialKids: KidRow[]
}

const emptyKid = (): KidRow => ({ name: "", dob: "" })

export function KidsForm({ initialKids }: Props) {
  const router = useRouter()
  const [kids, setKids] = useState<KidRow[]>(initialKids.length > 0 ? initialKids : [])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")

  function updateKid(i: number, field: keyof KidRow, value: string) {
    setKids((prev) => prev.map((k, idx) => (idx === i ? { ...k, [field]: value } : k)))
    setErrors((e) => ({ ...e, [`${field}_${i}`]: "" }))
  }

  function addKid() {
    setKids((prev) => [...prev, emptyKid()])
  }

  function removeKid(i: number) {
    setKids((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function finish(kidsToSave: KidRow[]) {
    setLoading(true)
    setServerError("")
    try {
      const res = await fetch("/api/kids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kids: kidsToSave.map((k) => ({ name: k.name.trim(), dob: k.dob || null })),
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
    const errs: Record<string, string> = {}
    kids.forEach((k, i) => {
      if (!k.name.trim()) { errs[`name_${i}`] = "Name is required" }
    })
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    await finish(kids)
  }

  async function handleSkip() {
    await finish([])
  }

  return (
    <Card className="fade-up">
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.375rem" }}>
        Your Kids
      </h2>
      <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "0.5rem", lineHeight: 1.6 }}>
        Optional — you can skip this and add children later in{" "}
        <strong style={{ color: "var(--text)" }}>Manage Family</strong>.
        Adding names and schools helps Famco recognise school emails and personalise Insights.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "1.25rem" }}>

        {kids.length === 0 ? (
          <button
            type="button"
            onClick={addKid}
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "2px dashed rgba(255,255,255,0.12)",
              borderRadius: "14px",
              padding: "1.5rem",
              color: "var(--muted)",
              fontSize: "0.875rem",
              cursor: "pointer",
              textAlign: "center",
              fontFamily: "'Inter',sans-serif",
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>👶</div>
            + Add a child
          </button>
        ) : (
          <>
            {kids.map((kid, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.875rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Child {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeKid(i)}
                    style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: "6px", fontFamily: "'Inter',sans-serif" }}
                  >
                    Remove
                  </button>
                </div>
                <Input
                  label="Name"
                  value={kid.name}
                  onChange={(e) => updateKid(i, "name", e.target.value)}
                  error={errors[`name_${i}`]}
                  placeholder="e.g. Emma"
                />
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
                    Date of Birth (optional)
                  </label>
                  <input
                    type="date"
                    value={kid.dob}
                    onChange={(e) => updateKid(i, "dob", e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    style={{
                      width: "100%", padding: "0.75rem 1rem", borderRadius: "12px",
                      background: "rgba(10,8,20,0.6)", border: "1px solid var(--border)",
                      color: "var(--text)", fontSize: "0.875rem", fontFamily: "'Inter', sans-serif",
                      outline: "none", colorScheme: "dark",
                    }}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addKid}
              style={{
                background: "none", border: "2px dashed rgba(255,255,255,0.12)",
                borderRadius: "14px", padding: "0.875rem", color: "var(--muted)",
                fontSize: "0.875rem", cursor: "pointer", fontFamily: "'Inter',sans-serif",
              }}
            >
              + Add another child
            </button>
          </>
        )}

        {serverError && <p style={{ color: "#f87171", fontSize: "0.8rem" }}>{serverError}</p>}

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={() => router.push("/onboarding/family")}
            style={{
              flex: 1, padding: "0.7rem", borderRadius: "10px",
              background: "none", border: "1px solid var(--border)",
              color: "var(--muted)", fontSize: "0.85rem", cursor: "pointer",
              fontFamily: "'Inter',sans-serif",
            }}
          >
            ← Back
          </button>
          {kids.length > 0 ? (
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2, padding: "0.7rem", borderRadius: "10px",
                background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg,#6366f1,#c084fc)",
                border: "none", color: "white", fontSize: "0.85rem",
                fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'Inter',sans-serif",
              }}
            >
              {loading ? "Saving…" : "Finish Setup →"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSkip}
              disabled={loading}
              style={{
                flex: 2, padding: "0.7rem", borderRadius: "10px",
                background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg,#6366f1,#c084fc)",
                border: "none", color: "white", fontSize: "0.85rem",
                fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'Inter',sans-serif",
              }}
            >
              {loading ? "Setting up…" : "Go to Dashboard →"}
            </button>
          )}
        </div>

        {kids.length === 0 && (
          <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--muted)", marginTop: "-0.25rem" }}>
            You can add children anytime in{" "}
            <strong style={{ color: "var(--text)" }}>Manage Family</strong>.
          </p>
        )}
      </form>
    </Card>
  )
}
