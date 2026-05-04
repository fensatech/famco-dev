"use client"
import { NAV, type Tab } from "../types"
import { NavIcon } from "./NavIcon"

interface Props {
  tab: Tab
  onTab: (t: Tab) => void
  scannedCount: number
  pendingTaskCount: number
}

export function MobileNav({ tab, onTab, scannedCount, pendingTaskCount }: Props) {
  return (
    <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: "64px", background: "rgba(255,255,255,0.95)", borderTop: "1px solid rgba(60,60,67,0.1)", display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "0.35rem", zIndex: 100, backdropFilter: "blur(20px)", boxShadow: "0 -1px 20px rgba(0,0,0,0.06)", overflowX: "auto", padding: "0 0.5rem" }}>
      {NAV.map(({ id, label, color, bg }) => {
        const active = tab === id
        return (
          <button key={id} onClick={() => onTab(id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem", background: active ? bg : "transparent", border: "none", cursor: "pointer", padding: "0.35rem 0.625rem 0.3rem", borderRadius: "12px", color: active ? color : "var(--muted)", fontSize: "0.58rem", fontWeight: active ? 700 : 400, fontFamily: "inherit", position: "relative", minWidth: "52px", flex: "0 0 auto" }}>
            <NavIcon id={id} size={22} color={active ? color : "var(--muted)"} />
            <span>{label}</span>
            {id === "insights" && scannedCount > 0 && (
              <span style={{ position: "absolute", top: "2px", right: "4px", background: "#fbbf24", color: "#000", borderRadius: "10px", fontSize: "0.5rem", fontWeight: 700, padding: "0.05rem 0.3rem" }}>{scannedCount > 99 ? "99+" : scannedCount}</span>
            )}
            {id === "tasks" && pendingTaskCount > 0 && (
              <span style={{ position: "absolute", top: "2px", right: "4px", background: "#f472b6", color: "#fff", borderRadius: "10px", fontSize: "0.5rem", fontWeight: 700, padding: "0.05rem 0.3rem" }}>{pendingTaskCount}</span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
