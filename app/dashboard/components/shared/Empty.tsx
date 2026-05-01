"use client"
export function Empty({ text }: { text: string }) {
  return (
    <div style={{ padding: "1.75rem", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px dashed var(--border)" }}>{text}</div>
  )
}
