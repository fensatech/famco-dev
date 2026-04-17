import { ONBOARDING_STEPS, STEP_LABELS, type OnboardingStep } from "@/types"

export function StepProgress({ current }: { current: OnboardingStep }) {
  const currentIndex = ONBOARDING_STEPS.indexOf(current)

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "2.5rem" }}>
      {ONBOARDING_STEPS.map((step, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <div key={step} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  fontFamily: "'Outfit',sans-serif",
                  transition: "all 0.3s",
                  background: done
                    ? "linear-gradient(135deg,#6366f1,#c084fc)"
                    : active
                    ? "rgba(99,102,241,0.2)"
                    : "rgba(255,255,255,0.05)",
                  border: active
                    ? "2px solid var(--accent)"
                    : done
                    ? "none"
                    : "2px solid rgba(255,255,255,0.1)",
                  color: done ? "white" : active ? "var(--accent)" : "var(--muted)",
                }}
              >
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: active ? "var(--accent)" : done ? "var(--text)" : "var(--muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {i < ONBOARDING_STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: "2px",
                  marginBottom: "1.25rem",
                  background: done ? "linear-gradient(90deg,#6366f1,#c084fc)" : "rgba(255,255,255,0.07)",
                  transition: "background 0.4s",
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
