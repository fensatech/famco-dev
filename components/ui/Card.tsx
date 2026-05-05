import { CSSProperties, HTMLAttributes } from "react"

export function Card({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const mergedStyle: CSSProperties = {
    background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,255,0.94))",
    border: "1px solid rgba(99,102,241,0.14)",
    borderRadius: "28px",
    boxShadow: "0 24px 70px rgba(15,23,42,0.08), 0 8px 24px rgba(99,102,241,0.08)",
    padding: "clamp(1.4rem, 3vw, 2rem)",
    position: "relative",
    overflow: "hidden",
    ...props.style,
  }

  return (
    <div
      className={className}
      {...props}
      style={mergedStyle}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "0 auto auto 0",
          width: "180px",
          height: "180px",
          background: "radial-gradient(circle at top left, rgba(129,140,248,0.18), transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  )
}
