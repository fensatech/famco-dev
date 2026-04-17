"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { FAMILY_TYPE_OPTIONS, type FamilyType } from "@/types"

interface Props {
  familyType: FamilyType | null
  coParentEmail: string
  partnerName: string
}

export function FamilyForm({ familyType, coParentEmail, partnerName }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<FamilyType | null>(familyType)
  const [extras, setExtras] = useState({
    co_parent_email: coParentEmail,
    partner_name: partnerName,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!selected) {
      errs.family_type = "Please choose a family type"
    }
    if (selected === "co_parent" && !extras.co_parent_email.trim()) {
      errs.co_parent_email = "Co-parent email is required"
    }
    if (
      (selected === "full_household" || selected === "blended") &&
      !extras.partner_name.trim()
    ) {
      errs.partner_name = "Partner name is required"
    }
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setLoading(true)
    setServerError("")
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family_type: selected,
          co_parent_email:
            selected === "co_parent" ? extras.co_parent_email.trim() : null,
          partner_name:
            selected === "full_household" || selected === "blended"
              ? extras.partner_name.trim()
              : null,
          onboarding_step: 4,
        }),
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
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.375rem" }}>
        Family Type
      </h2>
      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.875rem",
          marginBottom: "2rem",
          lineHeight: 1.6,
        }}
      >
        Help us tailor FAMCO to your family's situation.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
      >
        {/* Family type cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
          }}
        >
          {FAMILY_TYPE_OPTIONS.map((opt) => {
            const isActive = selected === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setSelected(opt.value)
                  setErrors((e) => ({ ...e, family_type: "" }))
                }}
                style={{
                  padding: "1rem",
                  borderRadius: "14px",
                  border: isActive
                    ? "2px solid var(--accent)"
                    : "2px solid var(--border)",
                  background: isActive
                    ? "rgba(99,102,241,0.12)"
                    : "rgba(255,255,255,0.02)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ fontSize: "1.5rem", marginBottom: "0.375rem" }}>
                  {opt.icon}
                </div>
                <p
                  style={{
                    fontSize: "0.825rem",
                    fontWeight: 600,
                    color: isActive ? "var(--accent)" : "var(--text)",
                    marginBottom: "0.2rem",
                    fontFamily: "'Outfit',sans-serif",
                  }}
                >
                  {opt.label}
                </p>
                <p
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--muted)",
                    lineHeight: 1.4,
                  }}
                >
                  {opt.description}
                </p>
              </button>
            )
          })}
        </div>
        {errors.family_type && (
          <p style={{ color: "#f87171", fontSize: "0.8rem", marginTop: "-0.5rem" }}>
            {errors.family_type}
          </p>
        )}

        {/* Co-parent extras */}
        {selected === "co_parent" && (
          <Input
            label="Co-parent's email"
            type="email"
            value={extras.co_parent_email}
            onChange={(e) =>
              setExtras((x) => ({ ...x, co_parent_email: e.target.value }))
            }
            error={errors.co_parent_email}
            placeholder="e.g. parent@example.com"
          />
        )}

        {/* Partner name extras */}
        {(selected === "full_household" || selected === "blended") && (
          <Input
            label="Partner's name"
            value={extras.partner_name}
            onChange={(e) =>
              setExtras((x) => ({ ...x, partner_name: e.target.value }))
            }
            error={errors.partner_name}
            placeholder="e.g. James"
          />
        )}

        {serverError && (
          <p style={{ color: "#f87171", fontSize: "0.8rem" }}>{serverError}</p>
        )}

        <Button type="submit" loading={loading} fullWidth disabled={!selected}>
          Continue →
        </Button>
      </form>
    </Card>
  )
}
