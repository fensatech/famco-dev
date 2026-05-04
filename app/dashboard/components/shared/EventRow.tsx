"use client"
import { useState } from "react"
import type { Event } from "@/lib/db"
import type { CalendarMemberOption } from "../../types"
import { fmtTime } from "../../lib/date"
import { inputSt, fieldLabelStyle } from "../../styles"

const SOURCE_LABEL: Record<string, string> = {
  manual: "Added manually", ics_import: "Imported from ICS file", gcal: "Google Calendar", email: "Email scan",
}

export function EventRow({ event, onDelete, onUpdate, kids }: {
  event: Event
  onDelete: (id: string) => void
  onUpdate?: (id: string, data: Partial<Event>) => void
  kids?: CalendarMemberOption[]
}) {
  const [showDetail, setShowDetail] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ title: event.title, event_date: event.event_date, start_time: event.start_time ?? "", end_time: event.end_time ?? "", member_name: event.member_name ?? "" })
  const [saving, setSaving] = useState(false)
  const isIcs = event.source === "ics_import"
  const mc = event.member_name && kids
    ? kids.find((member) => member.name === event.member_name)?.color ?? "#818cf8"
    : "#34d399"

  async function save() {
    if (!draft.title.trim() || !draft.event_date) return
    setSaving(true)
    await onUpdate?.(event.id, { title: draft.title.trim(), event_date: draft.event_date, start_time: draft.start_time || null, end_time: draft.end_time || null, member_name: draft.member_name || null })
    setSaving(false); setEditing(false)
  }

  return (
    <>
      {showDetail && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div onClick={() => { setShowDetail(false); setEditing(false) }} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "relative", background: "rgba(255,255,255,0.99)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: "20px", padding: "1.75rem", width: "100%", maxWidth: "480px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h3 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: "1.1rem" }}>📅 Event Details</h3>
              <button onClick={() => { setShowDetail(false); setEditing(false) }} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            {!editing ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                  <div><div style={fieldLabelStyle}>Title</div><div style={{ fontSize: "1rem", fontWeight: 700, marginTop: "0.2rem" }}>{event.title}</div></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div><div style={fieldLabelStyle}>Date</div><div style={{ fontSize: "0.875rem", marginTop: "0.2rem" }}>{event.event_date}</div></div>
                    <div><div style={fieldLabelStyle}>Time</div><div style={{ fontSize: "0.875rem", marginTop: "0.2rem" }}>{event.start_time ? fmtTime(event.start_time) : "—"}{event.end_time ? ` → ${fmtTime(event.end_time)}` : ""}</div></div>
                  </div>
                  {event.member_name && (
                    <div><div style={fieldLabelStyle}>Family Member</div><span style={{ display: "inline-block", marginTop: "0.2rem", fontSize: "0.78rem", color: mc, background: `${mc}20`, borderRadius: "10px", padding: "0.2rem 0.6rem", fontWeight: 700 }}>{event.member_name}</span></div>
                  )}
                  <div><div style={fieldLabelStyle}>Source</div><div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.2rem" }}>{SOURCE_LABEL[event.source] ?? event.source}</div></div>
                </div>
                <div style={{ display: "flex", gap: "0.625rem" }}>
                  <button onClick={() => { setShowDetail(false); onDelete(event.id) }} style={{ padding: "0.65rem 1rem", borderRadius: "10px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Delete</button>
                  {onUpdate && <button onClick={() => setEditing(true)} style={{ flex: 1, padding: "0.65rem 1rem", borderRadius: "10px", background: "linear-gradient(135deg,#6366f1,#c084fc)", border: "none", color: "white", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Edit Event</button>}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  <div><label style={fieldLabelStyle}>Title</label><input autoFocus value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} style={{ ...inputSt, marginTop: "0.25rem" }} placeholder="Event title" /></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                    <div><label style={fieldLabelStyle}>Date</label><input type="date" value={draft.event_date} onChange={(e) => setDraft((d) => ({ ...d, event_date: e.target.value }))} style={{ ...inputSt, marginTop: "0.25rem", colorScheme: "dark" }} /></div>
                    <div><label style={fieldLabelStyle}>Start Time</label><input type="time" value={draft.start_time} onChange={(e) => setDraft((d) => ({ ...d, start_time: e.target.value }))} style={{ ...inputSt, marginTop: "0.25rem", colorScheme: "dark" }} /></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                    <div><label style={fieldLabelStyle}>End Time</label><input type="time" value={draft.end_time} onChange={(e) => setDraft((d) => ({ ...d, end_time: e.target.value }))} style={{ ...inputSt, marginTop: "0.25rem", colorScheme: "dark" }} /></div>
                    {kids && kids.length > 0 && (
                      <div><label style={fieldLabelStyle}>Member</label><select value={draft.member_name} onChange={(e) => setDraft((d) => ({ ...d, member_name: e.target.value }))} style={{ ...inputSt, marginTop: "0.25rem", cursor: "pointer" }}><option value="">Family</option>{kids.map((k) => <option key={`${k.kind}-${k.name}`} value={k.name}>{k.name}</option>)}</select></div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.625rem" }}>
                  <button onClick={() => setEditing(false)} style={{ flex: 1, padding: "0.65rem", borderRadius: "10px", background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.82rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Cancel</button>
                  <button onClick={save} disabled={saving || !draft.title.trim() || !draft.event_date} style={{ flex: 2, padding: "0.65rem", borderRadius: "10px", background: "linear-gradient(135deg,#6366f1,#c084fc)", border: "none", color: "white", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{saving ? "Saving…" : "Save Changes"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <div onClick={() => { setShowDetail(true); setEditing(false) }} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.875rem", background: isIcs ? "rgba(129,140,248,0.04)" : "rgba(255,255,255,0.03)", borderRadius: "10px", border: `1px solid ${isIcs ? "rgba(129,140,248,0.2)" : "var(--border)"}`, cursor: "pointer" }}>
        {event.start_time && <span style={{ fontSize: "0.72rem", color: "#34d399", fontWeight: 600, minWidth: "56px", flexShrink: 0 }}>{fmtTime(event.start_time)}</span>}
        <span style={{ flex: 1, fontSize: "0.875rem" }}>{event.title}</span>
        {event.member_name && <span style={{ fontSize: "0.62rem", color: mc, background: `${mc}20`, borderRadius: "10px", padding: "0.1rem 0.45rem", fontWeight: 700, flexShrink: 0 }}>{event.member_name.split(" ")[0]}</span>}
        {isIcs && <span style={{ fontSize: "0.6rem", color: "#818cf8", opacity: 0.6, flexShrink: 0 }}>ics</span>}
        <span style={{ fontSize: "0.75rem", color: "var(--muted)", flexShrink: 0 }}>›</span>
      </div>
    </>
  )
}
