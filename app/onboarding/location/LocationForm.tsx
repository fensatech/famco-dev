"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Winnipeg",
  "America/Halifax",
  "America/St_Johns",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
]

interface Props {
  city: string
  timezone: string
  phone: string
}

export function LocationForm({ city, timezone, phone }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    city,
    timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    phone,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.city.trim()) errs.city = "City is required"
    if (!form.timezone) errs.timezone = "Timezone is required"
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
          city: form.city.trim(),
          timezone: form.timezone,
          phone: form.phone.trim() || null,
          onboarding_step: 3,
        }),
      })
      if (res.ok) {
        router.push("/onboarding/family")
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
        Your Location
      </h2>
      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.875rem",
          marginBottom: "2rem",
          lineHeight: 1.6,
        }}
      >
        We use this to show you local school calendars and set the right time
        for reminders.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
      >
        <Input
          label="City"
          value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          error={errors.city}
          placeholder="e.g. Toronto"
          autoFocus
        />

        <div className="flex flex-col gap-1.5">
          <label
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--muted)",
            }}
          >
            Timezone
          </label>
          <select
            value={form.timezone}
            onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              borderRadius: "12px",
              background: "rgba(10,8,20,0.6)",
              border: errors.timezone
                ? "1px solid #f87171"
                : "1px solid var(--border)",
              color: "var(--text)",
              fontSize: "0.875rem",
              fontFamily: "'Inter', sans-serif",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="">Select timezone…</option>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          {errors.timezone && (
            <p style={{ fontSize: "0.75rem", color: "#f87171" }}>
              {errors.timezone}
            </p>
          )}
        </div>

        <Input
          label="Phone (optional)"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="e.g. +1 416 555 0100"
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
