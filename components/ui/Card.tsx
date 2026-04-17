import { HTMLAttributes } from "react"

export function Card({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`glass p-8 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
