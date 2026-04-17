"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import type { ScannedMeeting } from "@/types"

export function EmailsForm({ provider }: { provider: string }) {
  const router = useRouter()
  const [scanning, setScanning] = useState(false)
  const [meetings, setMeetings] = useState<ScannedMeeting[] | null>(null)
  const [scanError, setScanError] = useState("")
  const [advancing, setAdvancing] = useState(false)
  const isGoogle = provider === "google"

  async function handleScan() {
    setScanning(true)
    setScanError("")
    try {
      const res = await fetch("/api/emails/scan", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setMeetings(data.meetings ?? [])
      } else {
        setScanError("Couldn't scan emails. You can skip this step.")
      }
    } catch {
      setScanError("Network error. You can skip this step.")
    }
    setScanning(false)
  }

  async function handleContinue() {
    setAdvancing(true)
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboarding_step: 2 }),
    })
    router.push("/onboarding/location")
  }

  return (
    <Card className="fade-up">
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.375rem" }}>
        Email Scan
      </h2>
      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.875rem",
          marginBottom: "2rem",
          lineHeight: 1.6,
        }}
      >
        {isGoogle
          ? "We can scan your Gmail for school events, appointments, and family meetings to pre-populate your calendar."
          : "Email scanning is available for Google accounts. You can skip this step and upload your calendar manually later."}
      </p>

      {isGoogle && !meetings && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: "12px",
              padding: "1rem 1.25rem",
              marginBottom: "1rem",
              fontSize: "0.8rem",
              color: "var(--muted)",
              lineHeight: 1.6,
            }}
          >
            🔒 We only read emails — we never send, delete, or modify anything.
            Access is read-only and limited to finding schedule-related emails.
          </div>
          <Button onClick={handleScan} loading={scanning} fullWidth>
            {scanning ? "Scanning…" : "Scan my Gmail"}
          </Button>
          {scanError && (
            <p style={{ color: "#f87171", fontSize: "0.8rem", marginTop: "0.5rem" }}>
              {scanError}
            </p>
          )}
        </div>
      )}

      {meetings !== null && (
        <div style={{ marginBottom: "1.5rem" }}>
          {meetings.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
              No upcoming meetings or school events found in the last 60 days.
            </p>
          ) : (
            <>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                  marginBottom: "0.75rem",
                }}
              >
                Found {meetings.length} event{meetings.length !== 1 ? "s" : ""}:
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  maxHeight: "240px",
                  overflowY: "auto",
                }}
              >
                {meetings.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      padding: "0.75rem",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "var(--text)",
                        marginBottom: "0.2rem",
                      }}
                    >
                      {m.subject}
                    </p>
                    <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                      {m.date} · {m.snippet}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        {isGoogle && meetings === null && (
          <Button
            variant="ghost"
            onClick={handleContinue}
            loading={advancing}
            fullWidth
          >
            Skip for now
          </Button>
        )}
        {(!isGoogle || meetings !== null) && (
          <Button onClick={handleContinue} loading={advancing} fullWidth>
            Continue →
          </Button>
        )}
      </div>
    </Card>
  )
}
