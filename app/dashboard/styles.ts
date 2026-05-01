import type { CSSProperties } from "react"

export const inputSt: CSSProperties = {
  width: "100%", padding: "0.625rem 0.875rem", borderRadius: "10px",
  background: "rgba(60,60,67,0.06)", border: "1px solid rgba(60,60,67,0.1)",
  color: "var(--text)", fontSize: "0.875rem", fontFamily: "inherit",
  outline: "none", boxSizing: "border-box",
}
export const fieldRowStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "0.375rem" }
export const fieldLabelStyle: CSSProperties = { fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }
export const savePillStyle: CSSProperties = { background: "linear-gradient(135deg,#6366f1,#c084fc)", border: "none", borderRadius: "8px", padding: "0.45rem 1rem", color: "white", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap", flexShrink: 0 }
export const navArrow: CSSProperties = { background: "#FFFFFF", border: "1px solid rgba(60,60,67,0.14)", borderRadius: "10px", padding: "0.35rem 0.875rem", color: "var(--text)", cursor: "pointer", fontSize: "0.9rem", fontFamily: "inherit", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }
export const fabStyle = (open: boolean): CSSProperties => ({ width: "54px", height: "54px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#c084fc)", border: "none", color: "white", fontSize: open ? "1.8rem" : "1.6rem", cursor: "pointer", boxShadow: "0 4px 24px rgba(99,102,241,0.55)", display: "flex", alignItems: "center", justifyContent: "center", transform: open ? "rotate(45deg)" : "none", transition: "transform 0.2s", lineHeight: 1 })
export const sectionCard: CSSProperties = { background: "#FFFFFF", border: "none", borderRadius: "20px", padding: "1.375rem", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }
