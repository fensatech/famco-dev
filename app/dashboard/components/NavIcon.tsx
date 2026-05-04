"use client"
import React from "react"

export function NavIcon({ id, size = 18, color = "currentColor" }: { id: string; size?: number; color?: string }) {
  const s = { width: size, height: size, display: "block", flexShrink: 0 } as React.CSSProperties
  const a = { fill: "none", stroke: color, strokeWidth: "1.7", strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  if (id === "home")     return <svg style={s} viewBox="0 0 24 24" {...a}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  if (id === "calendar") return <svg style={s} viewBox="0 0 24 24" {...a}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  if (id === "tasks")    return <svg style={s} viewBox="0 0 24 24" {...a}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
  if (id === "insights") return <svg style={s} viewBox="0 0 24 24" {...a}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  if (id === "data")     return <svg style={s} viewBox="0 0 24 24" {...a}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
  if (id === "expenses") return <svg style={s} viewBox="0 0 24 24" {...a}><circle cx="12" cy="12" r="9"/><line x1="12" y1="7" x2="12" y2="17"/><path d="M15 9a3 3 0 00-6 0c0 2 6 2 6 4a3 3 0 01-6 0"/></svg>
  if (id === "coparenting") return <svg style={s} viewBox="0 0 24 24" {...a}><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
  if (id === "settings") return <svg style={s} viewBox="0 0 24 24" {...a}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
  if (id === "billing") return <svg style={s} viewBox="0 0 24 24" {...a}><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/><path d="M7 15h3"/><path d="M14 15h4"/></svg>
  return <svg style={s} viewBox="0 0 24 24" {...a}><circle cx="12" cy="12" r="10"/></svg>
}
