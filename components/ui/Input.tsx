"use client"
import { InputHTMLAttributes, forwardRef } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--muted)" }}
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-all ${className}`}
        style={{
          background: "rgba(10,8,20,0.6)",
          border: error ? "1px solid #f87171" : "1px solid var(--border)",
          color: "var(--text)",
          fontFamily: "'Inter', sans-serif",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--accent)"
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)"
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? "#f87171" : "var(--border)"
          e.currentTarget.style.boxShadow = "none"
        }}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
)
Input.displayName = "Input"
