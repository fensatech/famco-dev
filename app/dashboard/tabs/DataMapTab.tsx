"use client"
import { useState, useRef } from "react"
import type { FamilyFact } from "@/types"
import { FACT_GROUPS, PREDICATE_META } from "@/lib/facts"
import type { ProfileData, KidRow, ScannedEventRow } from "../types"
import { todayStr } from "../lib/date"
import { memberColor } from "../lib/events"

function FactTag({ fact, onDelete, onUpdate }: {
  fact: FamilyFact
  onDelete?: (id: string) => void
  onUpdate?: (id: string, object: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(fact.object)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const dotColor = fact.confidence >= 0.85 ? "#34d399" : fact.confidence >= 0.6 ? "#fbbf24" : "#6b7280"
  const confidenceLabel = fact.confidence >= 0.85 ? "High confidence" : fact.confidence >= 0.6 ? "Moderate confidence" : "Low confidence"

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setDraft(fact.object)
    setEditing(true)
    setTimeout(() => { inputRef.current?.select() }, 50)
  }

  async function save() {
    if (!draft.trim() || draft.trim() === fact.object) { setEditing(false); return }
    setSaving(true)
    await onUpdate?.(fact.id, draft.trim())
    setSaving(false)
    setEditing(false)
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") save()
    if (e.key === "Escape") { setEditing(false); setDraft(fact.object) }
  }

  if (editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.4)", borderRadius: "8px", padding: "0.25rem 0.5rem" }}>
        <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} autoFocus style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "0.78rem", minWidth: "80px", width: `${Math.max(80, draft.length * 8)}px`, maxWidth: "220px" }} />
        <button onClick={save} disabled={saving} style={{ background: "#818cf8", border: "none", borderRadius: "4px", color: "white", fontSize: "0.65rem", padding: "0.15rem 0.45rem", cursor: saving ? "wait" : "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>{saving ? "…" : "Save"}</button>
        <button onClick={() => { setEditing(false); setDraft(fact.object) }} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.85rem", cursor: "pointer", lineHeight: 1, padding: "0 0.1rem" }}>✕</button>
      </div>
    )
  }

  return (
    <div
      title={`${confidenceLabel} · seen in ${fact.evidence_count} email${fact.evidence_count !== 1 ? "s" : ""} · click to edit`}
      onClick={onUpdate ? startEdit : undefined}
      style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "0.25rem 0.5rem", fontSize: "0.78rem", color: "var(--text)", cursor: onUpdate ? "pointer" : "default", userSelect: "none", transition: "background 0.12s, border-color 0.12s" }}
      onMouseEnter={(e) => { if (onUpdate) (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(129,140,248,0.4)" }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.1)" }}
    >
      <span title={confidenceLabel} style={{ width: "6px", height: "6px", borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{fact.object}</span>
      {fact.evidence_count > 1 && (
        <span title={`Confirmed by ${fact.evidence_count} emails`} style={{ fontSize: "0.6rem", color: "var(--muted)", opacity: 0.55, background: "rgba(255,255,255,0.06)", borderRadius: "4px", padding: "0 3px" }}>{fact.evidence_count} emails</span>
      )}
      {onUpdate && <span style={{ fontSize: "0.6rem", color: "var(--muted)", opacity: 0.45, marginLeft: "0.1rem" }}>✎</span>}
      {onDelete && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(fact.id) }} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.7rem", cursor: "pointer", padding: "0 0.05rem", lineHeight: 1, opacity: 0.5 }} title="Remove this fact">✕</button>
      )}
    </div>
  )
}

interface Props {
  profile: ProfileData
  kids: KidRow[]
  facts: FamilyFact[]
  scannedEvents: ScannedEventRow[]
  onDeleteFact: (id: string) => void
  onUpdateFact: (id: string, object: string) => void
}

export function DataMapTab({ profile, kids, facts, scannedEvents, onDeleteFact, onUpdateFact }: Props) {
  const parentName = `${profile.firstName} ${profile.lastName}`.trim() || "Parent"
  const familyNameTokens = new Set([
    profile.firstName.toLowerCase(), profile.lastName.toLowerCase(),
    parentName.toLowerCase(),
    ...kids.map((k) => k.name.toLowerCase()),
  ])

  const PERSON_PREDICATES = new Set(["attends_school", "current_grade", "participates_in", "taught_by", "sees_doctor", "sees_dentist"])
  const preFilter = facts.filter((f) => {
    if (f.status === "conflicted" || f.subject_type === "institution") return false
    if (PERSON_PREDICATES.has(f.predicate) && familyNameTokens.has(f.object.toLowerCase())) return false
    return true
  })
  const schoolObjects = new Set(preFilter.filter((f) => f.predicate === "attends_school").map((f) => f.object.toLowerCase()))
  const visibleFacts = preFilter.filter((f) => {
    if (f.predicate === "participates_in" && schoolObjects.has(f.object.toLowerCase())) return false
    return true
  })
  const members = [
    { name: parentName, subjectKey: parentName, isParent: true, icon: "👤", dob: null as string | null },
    ...kids.map((k) => ({ name: k.name, subjectKey: k.name, isParent: false, icon: "👧", dob: k.dob })),
  ]

  const activeGroups = FACT_GROUPS.filter((g) =>
    visibleFacts.some((f) => g.predicates.includes(f.predicate))
  )

  const today = todayStr()
  function upcomingFor(memberName: string, isParent: boolean): number {
    const kidNames = new Set(kids.map((k) => k.name.toLowerCase()))
    return scannedEvents.filter((e) => {
      if (!e.event_date || String(e.event_date).slice(0, 10) < today) return false
      if (isParent) return !e.kid_name || !kidNames.has((e.kid_name ?? "").toLowerCase())
      if (memberName === "family") return false
      return (e.kid_name ?? "").toLowerCase() === memberName.toLowerCase()
    }).length
  }

  const conflicted = facts.filter((f) => f.status === "conflicted")

  const cellStyle = { padding: "0.875rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.06)", verticalAlign: "top" as const }
  const headerCellStyle = { padding: "0.625rem 1rem", fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)" as const, textTransform: "uppercase" as const, letterSpacing: "0.05em", borderBottom: "1px solid rgba(255,255,255,0.1)", whiteSpace: "nowrap" as const }

  if (facts.length === 0) {
    return (
      <>
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Outfit',sans-serif", marginBottom: "0.25rem" }}>Family Knowledge Map</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>AI-extracted facts about your family, verified and deduplicated over time</p>
        </div>
        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--muted)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🧠</div>
          <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>No facts extracted yet</p>
          <p style={{ fontSize: "0.85rem" }}>After scanning your inbox from the Insights tab, Famco builds a verified picture of your household — schools, activities, appointments, and more.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Outfit',sans-serif", marginBottom: "0.25rem" }}>Family Knowledge Map</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>AI-built picture of your household · confirm, edit, or remove anything you see</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", fontSize: "0.72rem", color: "var(--muted)", alignItems: "center" }}>
          <span><span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: "#34d399", marginRight: "4px", verticalAlign: "middle" }} />Confirmed (&gt;85%)</span>
          <span><span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: "#fbbf24", marginRight: "4px", verticalAlign: "middle" }} />Uncertain (60–85%)</span>
          <span style={{ opacity: 0.5 }}>· click any tag to correct it</span>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "rgba(255,255,255,0.025)", borderRadius: "16px", border: "1px solid var(--border)", overflow: "hidden" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.04)" }}>
              <th style={{ ...headerCellStyle, textAlign: "left", minWidth: "140px" }}>Family Member</th>
              {activeGroups.map((g) => (
                <th key={g.id} style={{ ...headerCellStyle, textAlign: "left", minWidth: "180px" }}>{g.icon} {g.label}</th>
              ))}
              <th style={{ ...headerCellStyle, textAlign: "center", minWidth: "70px" }}>📅 Soon</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const memberFacts = visibleFacts.filter((f) => f.subject.toLowerCase() === member.subjectKey.toLowerCase())
              const gradeFactObj = memberFacts.find((f) => f.predicate === "current_grade")?.object
              const upcoming = upcomingFor(member.name, member.isParent)
              const nameColor = member.isParent ? "#818cf8" : member.subjectKey === "family" ? "#34d399" : memberColor(kids.findIndex((k) => k.name === member.name) + 1)
              return (
                <tr key={member.name}>
                  <td style={{ ...cellStyle, fontWeight: 700, color: nameColor }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.1rem" }}>{member.icon}</span>
                      <div>
                        <div>{member.name}</div>
                        <div style={{ fontSize: "0.68rem", color: "var(--muted)", fontWeight: 400 }}>
                          {member.isParent ? "Parent" : member.subjectKey === "family" ? "Shared" : gradeFactObj ? gradeFactObj : "Child"}
                        </div>
                      </div>
                    </div>
                  </td>
                  {activeGroups.map((group) => {
                    const groupFacts = memberFacts.filter((f) => group.predicates.includes(f.predicate))
                    return (
                      <td key={group.id} style={cellStyle}>
                        {groupFacts.length === 0
                          ? <span style={{ color: "var(--muted)", opacity: 0.35, fontSize: "0.75rem" }}>—</span>
                          : <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                              {groupFacts.map((f) => (
                                <div key={f.id}>
                                  {groupFacts.length > 1 && (
                                    <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginBottom: "0.1rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                                      {PREDICATE_META[f.predicate]?.label}
                                    </div>
                                  )}
                                  <FactTag fact={f} onDelete={onDeleteFact} onUpdate={onUpdateFact} />
                                </div>
                              ))}
                            </div>
                        }
                      </td>
                    )
                  })}
                  <td style={{ ...cellStyle, textAlign: "center" }}>
                    {upcoming > 0
                      ? <span style={{ fontWeight: 700, color: "#34d399", fontSize: "1rem" }}>{upcoming}</span>
                      : <span style={{ color: "var(--muted)", opacity: 0.35, fontSize: "0.75rem" }}>—</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {conflicted.length > 0 && (
        <div style={{ marginTop: "1.5rem", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "12px", padding: "1rem" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#f87171", marginBottom: "0.75rem" }}>⚠ Conflicted facts — grade or age inconsistency detected</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {conflicted.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.78rem" }}>
                <span style={{ color: "var(--muted)" }}>{f.subject}</span>
                <span style={{ color: "var(--muted)", opacity: 0.5 }}>→</span>
                <span style={{ color: "var(--muted)" }}>{PREDICATE_META[f.predicate]?.label ?? f.predicate}</span>
                <span style={{ color: "var(--muted)", opacity: 0.5 }}>→</span>
                <span style={{ color: "#f87171" }}>{f.object}</span>
                <span style={{ fontSize: "0.65rem", color: "var(--muted)", opacity: 0.6 }}>({Math.round(f.confidence * 100)}% conf · {f.evidence_count} email{f.evidence_count !== 1 ? "s" : ""})</span>
                <button onClick={() => onDeleteFact(f.id)} style={{ background: "none", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "6px", color: "#f87171", cursor: "pointer", fontSize: "0.7rem", padding: "0.1rem 0.4rem" }}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {[
          { label: "Total facts", value: facts.length, color: "#818cf8" },
          { label: "Confirmed", value: facts.filter((f) => f.status === "confirmed").length, color: "#34d399" },
          { label: "Uncertain", value: facts.filter((f) => f.status === "uncertain").length, color: "#fbbf24" },
          { label: "Conflicted", value: conflicted.length, color: "#f87171" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: `${color}0d`, border: `1px solid ${color}33`, borderRadius: "10px", padding: "0.5rem 1rem", textAlign: "center", minWidth: "80px" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{label}</div>
          </div>
        ))}
      </div>
    </>
  )
}
