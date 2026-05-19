import React from "react"
import clsx from "clsx"

type ButtonProps = {
  children: React.ReactNode
  variant?: "primary" | "outline" | "ghost"
  fullWidth?: boolean
  className?: string
  selected?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export const APButton: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  fullWidth = false,
  className,
  ...props
}) => {
  return (
    <button
      className={clsx(
        "rounded-lg px-4 py-2 text-sm font-medium transition-all focus:outline-none",
        {
          "bg-blue-600 text-white hover:bg-blue-700 ": variant === "primary",
          "bg-white border border-[#6c757d] text-[#6c757d] hover:bg-[#6c757d] hover:text-white ":
            variant === "outline",
          "bg-transparent text-gray-900 hover:bg-gray-100  ":
            variant === "ghost",
          "w-full": fullWidth,
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
