"use client"
export function SectionHeader({ title, accent, onAdd }: { title: string; accent: string; onAdd?: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
      <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>{title}</h3>
      {onAdd && <button onClick={onAdd} style={{ background: `${accent}22`, border: `1px solid ${accent}44`, borderRadius: "8px", padding: "0.3rem 0.75rem", color: accent, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>+ Add</button>}
    </div>
  )
}
