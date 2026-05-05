"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

interface Props {
  firstName: string
  lastName: string
}

export function ProfileForm({ firstName, lastName }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({ first_name: firstName, last_name: lastName })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.first_name.trim()) errs.first_name = "First name is required"
    if (!form.last_name.trim()) errs.last_name = "Last name is required"
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
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          onboarding_step: 1,
        }),
      })
      if (res.ok) {
        router.push("/onboarding/location")
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
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          borderRadius: "999px",
          padding: "0.3rem 0.65rem",
          background: "rgba(99,102,241,0.08)",
          color: "#4f46e5",
          fontSize: "0.72rem",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: "0.9rem",
        }}
      >
        Profile
      </div>

      <h2
        style={{
          fontSize: "clamp(1.65rem, 3vw, 2.05rem)",
          fontWeight: 800,
          marginBottom: "0.45rem",
        }}
      >
        Tell us who is getting things started
      </h2>
      <p
        style={{
          color: "#5b6475",
          fontSize: "0.92rem",
          marginBottom: "1.75rem",
          lineHeight: 1.7,
          maxWidth: "44ch",
        }}
      >
        We use your name to personalize the dashboard and identify the primary household owner for setup and billing later.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1.15rem" }}
      >
        <Input
          label="First Name"
          value={form.first_name}
          onChange={(e) =>
            setForm((current) => ({ ...current, first_name: e.target.value }))
          }
          error={errors.first_name}
          autoFocus
          placeholder="e.g. Sarah"
        />
        <Input
          label="Last Name"
          value={form.last_name}
          onChange={(e) =>
            setForm((current) => ({ ...current, last_name: e.target.value }))
          }
          error={errors.last_name}
          placeholder="e.g. Johnson"
        />
        {serverError && (
          <p style={{ color: "#f87171", fontSize: "0.8rem" }}>{serverError}</p>
        )}

        <div
          style={{
            marginTop: "0.35rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: "0.76rem", color: "var(--muted)" }}>
            You can change these details later in Manage Family.
          </div>
          <Button type="submit" loading={loading}>
            {loading ? "Saving..." : "Continue"}
          </Button>
        </div>
      </form>
    </Card>
  )
}
