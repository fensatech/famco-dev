"use client"
import { useState, useRef } from "react"
import { signOut } from "next-auth/react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { FAMILY_TYPE_OPTIONS, type FamilyType } from "@/types"

interface Props {
  firstName: string
  familyType: FamilyType | null
  kids: { name: string; dob: string | null }[]
  provider: string
}

export function DashboardShell({ firstName, familyType, kids, provider }: Props) {
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [uploadError, setUploadError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const familyLabel =
    FAMILY_TYPE_OPTIONS.find((o) => o.value === familyType)?.label ?? ""

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith(".ics")) {
      setUploadError("Please upload an .ics calendar file.")
      return
    }
    setUploading(true)
    setUploadError("")
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch("/api/calendar/upload", {
        method: "POST",
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        setUploadedFiles((prev) => [...prev, data.filename])
      } else {
        const data = await res.json().catch(() => ({}))
        setUploadError(data.error ?? "Upload failed. Please try again.")
      }
    } catch {
      setUploadError("Network error. Please try again.")
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem 1.5rem",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "2.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              background: "linear-gradient(135deg,#6366f1,#c084fc)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1rem",
            }}
          >
            🏠
          </div>
          <span
            style={{
              fontFamily: "'Outfit',sans-serif",
              fontWeight: 700,
              fontSize: "1.1rem",
              letterSpacing: "-0.02em",
            }}
          >
            FAMCO
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "0.4rem 0.875rem",
            color: "var(--muted)",
            fontSize: "0.8rem",
            cursor: "pointer",
            fontFamily: "'Inter',sans-serif",
            transition: "all 0.2s",
          }}
        >
          Sign out
        </button>
      </div>

      {/* Welcome */}
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.375rem" }}
        >
          Welcome back,{" "}
          <span className="gradient-text">{firstName || "there"}</span> 👋
        </h1>
        {familyLabel && (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            {familyLabel}
            {kids.length > 0 && (
              <>
                {" "}
                · {kids.length} kid{kids.length !== 1 ? "s" : ""}:{" "}
                {kids.map((k) => k.name).join(", ")}
              </>
            )}
          </p>
        )}
      </div>

      {/* Cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {/* Calendar upload card */}
        <Card className="fade-up">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                background: "rgba(99,102,241,0.15)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.1rem",
              }}
            >
              📅
            </div>
            <div>
              <h3
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  marginBottom: "0.1rem",
                }}
              >
                School Calendar
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                Import .ics calendar files
              </p>
            </div>
          </div>

          <p
            style={{
              fontSize: "0.825rem",
              color: "var(--muted)",
              marginBottom: "1.25rem",
              lineHeight: 1.6,
            }}
          >
            Download your school's calendar from their website and upload it
            here. Most schools publish a .ics file you can import.
          </p>

          {uploadedFiles.length > 0 && (
            <div
              style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}
            >
              {uploadedFiles.map((f, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: "0.75rem",
                    color: "#4ade80",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {f}
                </div>
              ))}
            </div>
          )}

          {uploadError && (
            <p
              style={{
                color: "#f87171",
                fontSize: "0.8rem",
                marginBottom: "0.75rem",
              }}
            >
              {uploadError}
            </p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".ics"
            onChange={handleFileChange}
            style={{ display: "none" }}
            id="calendar-upload"
          />
          <label htmlFor="calendar-upload">
            <Button
              variant="outline"
              fullWidth
              loading={uploading}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              {uploading ? "Uploading…" : "Upload Calendar (.ics)"}
            </Button>
          </label>
        </Card>

        {/* Kids overview */}
        {kids.length > 0 && (
          <Card className="fade-up">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  background: "rgba(192,132,252,0.15)",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                }}
              >
                👧
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    marginBottom: "0.1rem",
                  }}
                >
                  Your Kids
                </h3>
                <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  {kids.length} child{kids.length !== 1 ? "ren" : ""} registered
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {kids.map((kid, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.625rem",
                    padding: "0.625rem 0.75rem",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg,#6366f1,#c084fc)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "white",
                    }}
                  >
                    {kid.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      {kid.name}
                    </p>
                    {kid.dob && (
                      <p style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                        Born {new Date(kid.dob).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Coming soon card */}
        <Card className="fade-up">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                background: "rgba(251,191,36,0.1)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.1rem",
              }}
            >
              🗓️
            </div>
            <div>
              <h3
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  marginBottom: "0.1rem",
                }}
              >
                Family Schedule
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                Coming soon
              </p>
            </div>
          </div>
          <p
            style={{
              fontSize: "0.825rem",
              color: "var(--muted)",
              lineHeight: 1.6,
            }}
          >
            Shared family calendar, reminders, and schedule coordination —
            coming in the next update.
          </p>
        </Card>
      </div>
    </main>
  )
}
