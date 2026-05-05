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
          style={{ color: "#71717a", letterSpacing: "0.12em" }}
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`w-full px-4 py-3 rounded-[16px] text-[0.92rem] outline-none transition-all ${className}`}
        style={{
          background: "#fcfcff",
          border: error ? "1px solid #f87171" : "1px solid rgba(99,102,241,0.14)",
          color: "var(--text)",
          fontFamily: "'Inter', sans-serif",
          boxShadow: "inset 0 1px 2px rgba(15,23,42,0.04)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--accent)"
          e.currentTarget.style.boxShadow = "0 0 0 4px rgba(99,102,241,0.14), inset 0 1px 2px rgba(15,23,42,0.04)"
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? "#f87171" : "rgba(99,102,241,0.14)"
          e.currentTarget.style.boxShadow = "inset 0 1px 2px rgba(15,23,42,0.04)"
        }}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
)
Input.displayName = "Input"
