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
        router.push("/onboarding/emails")
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
      <h2
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          marginBottom: "0.375rem",
        }}
      >
        Your Profile
      </h2>
      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.875rem",
          marginBottom: "2rem",
          lineHeight: 1.6,
        }}
      >
        Let's start with your name so we can personalise your experience.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
      >
        <Input
          label="First Name"
          value={form.first_name}
          onChange={(e) =>
            setForm((f) => ({ ...f, first_name: e.target.value }))
          }
          error={errors.first_name}
          autoFocus
          placeholder="e.g. Sarah"
        />
        <Input
          label="Last Name"
          value={form.last_name}
          onChange={(e) =>
            setForm((f) => ({ ...f, last_name: e.target.value }))
          }
          error={errors.last_name}
          placeholder="e.g. Johnson"
        />
        {serverError && (
          <p style={{ color: "#f87171", fontSize: "0.8rem" }}>{serverError}</p>
        )}
        <Button type="submit" loading={loading} fullWidth>
          Continue →
        </Button>
      </form>
    </Card>
  )
}
