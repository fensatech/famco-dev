"use client"
import { useState } from "react"
import { fabStyle } from "../styles"

function FabOption({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: "rgba(16,14,36,0.98)", border: "1px solid var(--border)", borderRadius: "20px", padding: "0.5rem 1.25rem", color: "var(--text)", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", backdropFilter: "blur(8px)", whiteSpace: "nowrap", fontFamily: "'Inter',sans-serif", boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
      {label}
    </button>
  )
}

interface Props {
  onAddEvent: () => void
  onAddTask: () => void
}

export function FabMenu({ onAddEvent, onAddTask }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: "fixed", bottom: "2rem", right: "2rem", zIndex: 50 }}>
      {open && (
        <div style={{ position: "absolute", bottom: "4rem", right: 0, display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
          <FabOption label="Add Event" onClick={() => { onAddEvent(); setOpen(false) }} />
          <FabOption label="Add Task" onClick={() => { onAddTask(); setOpen(false) }} />
        </div>
      )}
      <button onClick={() => setOpen((v) => !v)} style={fabStyle(open)}>
        {open ? "×" : "+"}
      </button>
    </div>
  )
}
