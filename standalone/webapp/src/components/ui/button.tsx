import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

// Centralized button — the single source of truth for non-MUI buttons across
// the app. The variant/size API mirrors shadcn/ui so it can be swapped for the
// shadcn <Button> later with minimal churn. Colors come from theme tokens, so
// it stays consistent in light/dark and with the editor.
export type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
export type ButtonSize = "sm" | "default" | "lg" | "icon"

const VARIANTS: Record<ButtonVariant, string> = {
  default:
    "border border-[var(--home-accent-base)] bg-[var(--home-accent-base)] text-[var(--home-accent-contrast)] hover:opacity-90",
  secondary:
    "border border-[var(--home-border-default)] bg-[var(--home-surface-raised)] text-[var(--home-text-secondary)] hover:bg-[var(--home-surface-raised-hover)] hover:text-[var(--home-text-primary)]",
  outline:
    "border border-[var(--home-border-default)] bg-transparent text-[var(--home-text-secondary)] hover:bg-[var(--home-surface-raised)] hover:text-[var(--home-text-primary)]",
  ghost:
    "border border-transparent bg-transparent text-[var(--home-text-secondary)] hover:bg-[var(--home-surface-raised)] hover:text-[var(--home-text-primary)]",
  destructive:
    "border border-[var(--apollon-alert-danger-border)] bg-[var(--apollon-alert-danger-color)] text-white hover:opacity-90",
}

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  default: "h-9 gap-1.5 px-4 text-sm",
  lg: "h-10 gap-2 px-6 text-sm",
  icon: "h-9 w-9",
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Optional leading element (e.g. an inline icon svg). */
  icon?: ReactNode
  fullWidth?: boolean
}

export const Button = ({
  variant = "default",
  size = "default",
  icon,
  fullWidth = false,
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    className={cn(
      "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[var(--home-radius-md)] font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--home-accent-ring)] disabled:cursor-not-allowed disabled:opacity-60",
      VARIANTS[variant],
      SIZES[size],
      fullWidth && "w-full",
      className
    )}
    {...rest}
  >
    {icon}
    {children}
  </button>
)
