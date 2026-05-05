"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { StepProgress } from "@/components/onboarding/StepProgress"
import { ONBOARDING_STEPS, type OnboardingStep } from "@/types"

const STEP_CONTENT: Record<
  OnboardingStep,
  { badge: string; title: string; description: string; highlights: string[] }
> = {
  profile: {
    badge: "Step 1 of 4",
    title: "A calm start for your family workspace",
    description:
      "We keep setup intentionally light so you can reach the dashboard quickly and finish the rest later.",
    highlights: [
      "Takes about two minutes to get through the basics",
      "You can change any detail later in Manage Family",
      "Insights improve as your household profile becomes richer",
    ],
  },
  location: {
    badge: "Step 2 of 4",
    title: "Make schedules feel local and useful",
    description:
      "Your city and timezone help Famco place reminders, school timing, and household planning in the right context.",
    highlights: [
      "Used for local school and appointment timing",
      "Phone stays optional during setup",
      "You can refine addresses later from the dashboard",
    ],
  },
  family: {
    badge: "Step 3 of 4",
    title: "Shape the household around real life",
    description:
      "A quick household type helps Famco understand how to organize your calendar, Insights, and shared planning.",
    highlights: [
      "Optional and easy to change later",
      "Helps with co-parenting and family context",
      "Keeps the dashboard more relevant from day one",
    ],
  },
  kids: {
    badge: "Step 4 of 4",
    title: "Add children only if it helps right now",
    description:
      "You can skip this and land in the dashboard, or add names now so Famco can better recognize school and activity emails.",
    highlights: [
      "Children are optional during onboarding",
      "School relevance gets better when names are known",
      "Everything can be expanded later in Manage Family",
    ],
  },
}

export function OnboardingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const step = (ONBOARDING_STEPS.find((item) => pathname.includes(`/${item}`)) ??
    "profile") as OnboardingStep
  const [isCompact, setIsCompact] = useState(false)
  const stepContent = STEP_CONTENT[step]

  useEffect(() => {
    const update = () => setIsCompact(window.innerWidth < 920)
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        padding: "clamp(1rem, 3vw, 2rem)",
        background:
          "radial-gradient(circle at top left, rgba(129,140,248,0.16), transparent 32%), radial-gradient(circle at bottom right, rgba(56,189,248,0.1), transparent 28%), linear-gradient(180deg, #f8f8ff 0%, #eef2ff 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1120px",
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "minmax(300px, 360px) minmax(0, 1fr)",
          gap: "1.25rem",
          alignItems: "start",
        }}
      >
        <aside
          style={{
            borderRadius: "32px",
            padding: "clamp(1.35rem, 3vw, 2rem)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(244,247,255,0.9))",
            border: "1px solid rgba(99,102,241,0.12)",
            boxShadow: "0 24px 80px rgba(15,23,42,0.08)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              right: "-80px",
              top: "-80px",
              width: "220px",
              height: "220px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(129,140,248,0.22), transparent 68%)",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1.4rem",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  background: "linear-gradient(135deg,#5b6df7,#8b5cf6)",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.86rem",
                  fontWeight: 800,
                  color: "#fff",
                  flexShrink: 0,
                  boxShadow: "0 16px 36px rgba(99,102,241,0.22)",
                }}
              >
                FM
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Outfit',sans-serif",
                    fontWeight: 800,
                    fontSize: "1.08rem",
                    letterSpacing: "-0.03em",
                  }}
                >
                  Famco Setup
                </div>
                <div style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                  Family command center onboarding
                </div>
              </div>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                borderRadius: "999px",
                padding: "0.35rem 0.7rem",
                background: "rgba(99,102,241,0.08)",
                color: "#4f46e5",
                fontSize: "0.72rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "1rem",
              }}
            >
              {stepContent.badge}
            </div>

            <h1
              style={{
                fontSize: isCompact ? "1.65rem" : "2rem",
                lineHeight: 1.05,
                fontWeight: 800,
                marginBottom: "0.75rem",
                maxWidth: "12ch",
              }}
            >
              {stepContent.title}
            </h1>
            <p
              style={{
                color: "#5b6475",
                fontSize: "0.9rem",
                lineHeight: 1.7,
                marginBottom: "1.35rem",
                maxWidth: "34ch",
              }}
            >
              {stepContent.description}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem", marginBottom: isCompact ? "1rem" : "1.5rem" }}>
              {stepContent.highlights.map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem" }}>
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "999px",
                      background: "rgba(52,211,153,0.16)",
                      color: "#059669",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    +
                  </div>
                  <div style={{ fontSize: "0.82rem", lineHeight: 1.6, color: "#4b5563" }}>{item}</div>
                </div>
              ))}
            </div>

            {!isCompact && (
              <div
                style={{
                  borderRadius: "22px",
                  background: "linear-gradient(135deg, rgba(79,70,229,0.08), rgba(56,189,248,0.08))",
                  border: "1px solid rgba(79,70,229,0.12)",
                  padding: "1rem 1.05rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#4f46e5",
                    marginBottom: "0.35rem",
                  }}
                >
                  Why this stays light
                </div>
                <div style={{ fontSize: "0.8rem", color: "#525f7a", lineHeight: 1.65 }}>
                  Famco gets smarter over time. The goal here is to get you into the dashboard quickly, then let Manage Family and Insights do the deeper household work.
                </div>
              </div>
            )}
          </div>
        </aside>

        <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <StepProgress current={step} />
          {children}
        </section>
      </div>
    </main>
  )
}
