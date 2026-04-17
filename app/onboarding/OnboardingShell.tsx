"use client"
import { usePathname } from "next/navigation"
import { StepProgress } from "@/components/onboarding/StepProgress"
import { ONBOARDING_STEPS, type OnboardingStep } from "@/types"

export function OnboardingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const step = (ONBOARDING_STEPS.find((s) => pathname.includes(`/${s}`)) ??
    "profile") as OnboardingStep

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "640px" }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              marginBottom: "2rem",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                background: "linear-gradient(135deg,#6366f1,#c084fc)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.9rem",
                flexShrink: 0,
              }}
            >
              🏠
            </div>
            <span
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 700,
                fontSize: "1rem",
                letterSpacing: "-0.02em",
              }}
            >
              FAMCO Setup
            </span>
          </div>
          <StepProgress current={step} />
        </div>
        {children}
      </div>
    </main>
  )
}
