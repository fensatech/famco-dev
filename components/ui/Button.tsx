"use client"
import { ButtonHTMLAttributes, forwardRef } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline"
  loading?: boolean
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading, fullWidth, children, className = "", disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-semibold text-sm rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"

    const variants = {
      primary:
        "bg-gradient-to-r from-[#6366f1] to-[#c084fc] text-white px-6 py-3 shadow-[0_8px_24px_rgba(99,102,241,0.35)] hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(99,102,241,0.5)]",
      ghost:
        "bg-white/5 border border-white/10 text-white px-6 py-3 hover:border-[#818cf8] hover:text-[#818cf8]",
      outline:
        "border border-[rgba(99,102,241,0.4)] text-[#818cf8] px-6 py-3 hover:bg-[rgba(99,102,241,0.1)]",
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
        style={{ fontFamily: "'Outfit', sans-serif" }}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"
