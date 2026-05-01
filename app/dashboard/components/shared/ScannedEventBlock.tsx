"use client"
import { useState } from "react"
import type { ScannedEventRow } from "../../types"
import { fmtTime } from "../../lib/date"
import { EVENT_TYPE_LABEL } from "../../lib/events"

export function ScannedEventBlock({ ev, color }: { ev: ScannedEventRow; color: string }) {
  const [expanded, setExpanded] = useState(false)
  const timeStr = ev.start_time ? fmtTime(ev.start_time) : ""
  return (
    <div onClick={() => setExpanded((v) => !v)} style={{ cursor: "pointer", padding: "0.625rem 0.875rem", background: `${color}10`, borderRadius: "10px", border: `1px solid ${color}33`, borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {timeStr && <span style={{ fontSize: "0.72rem", color, fontWeight: 600, minWidth: "56px", flexShrink: 0 }}>{timeStr}</span>}
        <span style={{ flex: 1, fontSize: "0.875rem" }}>{ev.calendar_title ?? ev.title}</span>
        {ev.kid_name && (
          <span style={{ fontSize: "0.62rem", color, background: `${color}22`, borderRadius: "10px", padding: "0.1rem 0.45rem", fontWeight: 700, flexShrink: 0 }}>{ev.kid_name.split(" ")[0]}</span>
        )}
        <span style={{ fontSize: "0.6rem", color: "var(--muted)", opacity: 0.5 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--muted)", borderTop: `1px solid ${color}22`, paddingTop: "0.5rem" }}>
          {ev.special_instructions && <p style={{ color: "#fbbf24", marginBottom: "0.25rem" }}>📌 {ev.special_instructions}</p>}
          {ev.snippet && <p style={{ opacity: 0.8, lineHeight: 1.5 }}>{ev.snippet.slice(0, 200)}</p>}
          <p style={{ marginTop: "0.25rem", opacity: 0.5, fontSize: "0.68rem" }}>{EVENT_TYPE_LABEL[ev.event_type] ?? ev.event_type} · {ev.organization_name ?? ev.source_from.split("@")[1] ?? ""}</p>
        </div>
      )}
    </div>
  )
}
