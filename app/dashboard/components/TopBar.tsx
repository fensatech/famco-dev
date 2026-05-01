"use client"
import { NAV, type Tab } from "../types"
import { NavIcon } from "./NavIcon"
import { todayLabel } from "../lib/date"

export function TopBar({ tab }: { tab: Tab }) {
  const activeNav = NAV.find((n) => n.id === tab)!
  return (
    <header style={{ padding: "0.875rem 2rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <NavIcon id={activeNav.id} size={18} color={activeNav.color} />
        <h1 style={{ fontSize: "1.05rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)" }}>{activeNav.label}</h1>
      </div>
      <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{todayLabel()}</span>
    </header>
  )
}
