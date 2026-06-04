import type { ButtonHTMLAttributes, ReactNode } from "react"

/**
 * Single source of truth for home-dashboard buttons.
 *
 * Every home button funnels through here so hover/focus/disabled behaviour is
 * defined ONCE per variant instead of being re-implemented (and drifting) at
 * each call site. Hover is pure CSS — no inline onMouseEnter/onMouseLeave
 * handlers — so the feel is identical everywhere a variant is used.
 */
export type HomeButtonVariant = "primary" | "secondary" | "ghost" | "danger"
export type HomeButtonSize = "sm" | "md"

type HomeButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: HomeButtonVariant
  size?: HomeButtonSize
  /** Optional leading icon (already sized by the caller, e.g. an inline svg). */
  icon?: ReactNode
  fullWidth?: boolean
}

const BASE =
  "home-btn inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 " +
  "rounded-[var(--home-radius-md)] font-semibold transition-colors duration-200 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--home-accent-ring)] " +
  "disabled:cursor-not-allowed disabled:opacity-60"

const SIZES: Record<HomeButtonSize, string> = {
  // 32px tall (header row controls)
  sm: "h-8 px-3 text-xs",
  // 36px tall (dialogs, empty-state)
  md: "h-9 px-4 text-sm",
}

// One hover treatment per variant — defined here, nowhere else.
const VARIANTS: Record<HomeButtonVariant, string> = {
  primary:
    "border border-[var(--home-accent-base)] bg-[var(--home-accent-base)] " +
    "text-[var(--home-accent-contrast)] hover:opacity-90",
  secondary:
    "border border-[var(--home-border-default)] bg-[var(--home-surface-raised)] " +
    "text-[var(--home-text-secondary)] hover:bg-[var(--home-surface-raised-hover)] " +
    "hover:text-[var(--home-text-primary)]",
  ghost:
    "border border-[var(--home-border-default)] bg-transparent " +
    "text-[var(--home-text-secondary)] hover:bg-[var(--home-surface-raised)] " +
    "hover:text-[var(--home-text-primary)]",
  danger:
    "border border-[var(--apollon-alert-danger-border)] bg-[var(--apollon-alert-danger-color)] " +
    "text-white hover:opacity-90",
}

export const HomeButton = ({
  variant = "secondary",
  size = "md",
  icon,
  fullWidth = false,
  className = "",
  children,
  type = "button",
  ...rest
}: HomeButtonProps) => (
  <button
    type={type}
    className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${
      fullWidth ? "w-full" : ""
    } ${className}`.trim()}
    {...rest}
  >
    {icon}
    {children}
  </button>
)
