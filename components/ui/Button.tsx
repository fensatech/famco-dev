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
      "inline-flex items-center justify-center gap-2 font-semibold text-sm rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"

    const variants = {
      primary:
        "bg-gradient-to-r from-[#5b6df7] via-[#6366f1] to-[#8b5cf6] text-white px-6 py-3.5 shadow-[0_14px_30px_rgba(99,102,241,0.28)] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(99,102,241,0.35)]",
      ghost:
        "bg-white/75 border border-[rgba(99,102,241,0.12)] text-[#4338ca] px-6 py-3.5 hover:border-[#818cf8] hover:bg-[rgba(99,102,241,0.06)]",
      outline:
        "border border-[rgba(99,102,241,0.24)] text-[#4f46e5] px-6 py-3.5 bg-white/80 hover:bg-[rgba(99,102,241,0.06)]",
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
