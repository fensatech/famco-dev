"use client"
import type { GCalEvent } from "../../types"
import { fmtTime } from "../../lib/date"

export function GCalEventRow({ event, onClick }: { event: GCalEvent; onClick: () => void }) {
  const timeStr = event.allDay ? "All day" : event.start ? fmtTime(event.start.split("T")[1]?.slice(0, 5) ?? "") : ""
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.875rem", background: "rgba(99,102,241,0.08)", borderRadius: "10px", border: "1px solid rgba(99,102,241,0.22)", cursor: "pointer" }}>
      <span style={{ fontSize: "0.85rem" }}>📅</span>
      {timeStr && <span style={{ fontSize: "0.72rem", color: "#818cf8", fontWeight: 600, minWidth: "56px", flexShrink: 0 }}>{timeStr}</span>}
      <span style={{ flex: 1, fontSize: "0.875rem" }}>{event.title}</span>
      <span style={{ fontSize: "0.65rem", color: "#818cf8", background: "rgba(99,102,241,0.15)", borderRadius: "6px", padding: "0.1rem 0.4rem", flexShrink: 0 }}>Google ›</span>
    </div>
  )
}
