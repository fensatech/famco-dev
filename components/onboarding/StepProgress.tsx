import { ONBOARDING_STEPS, STEP_LABELS, type OnboardingStep } from "@/types"

export function StepProgress({ current }: { current: OnboardingStep }) {
  const currentIndex = ONBOARDING_STEPS.indexOf(current)

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0",
        borderRadius: "22px",
        border: "1px solid rgba(99,102,241,0.12)",
        background: "rgba(255,255,255,0.7)",
        padding: "0.95rem 1rem",
        boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
        overflowX: "auto",
      }}
    >
      {ONBOARDING_STEPS.map((step, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <div key={step} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.45rem", minWidth: 0 }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  fontFamily: "'Outfit',sans-serif",
                  transition: "all 0.3s",
                  background: done
                    ? "linear-gradient(135deg,#5b6df7,#8b5cf6)"
                    : active
                    ? "rgba(99,102,241,0.12)"
                    : "rgba(255,255,255,0.92)",
                  border: active
                    ? "2px solid var(--accent)"
                    : done
                    ? "none"
                    : "1px solid rgba(99,102,241,0.14)",
                  color: done ? "white" : active ? "var(--accent)" : "var(--muted)",
                  boxShadow: done || active ? "0 10px 24px rgba(99,102,241,0.18)" : "none",
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
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  color: active ? "var(--accent)" : done ? "#312e81" : "var(--muted)",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                }}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {i < ONBOARDING_STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: "3px",
                  borderRadius: "999px",
                  margin: "0 0.75rem 1.35rem",
                  background: done ? "linear-gradient(90deg,#5b6df7,#8b5cf6)" : "rgba(99,102,241,0.08)",
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
