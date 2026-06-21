import { Link } from "@tanstack/react-router"
import { cn } from "@tumaet/ui/lib/utils"
import type { BackTarget } from "@/hooks/useBackTarget"

type BackNavTone = "onDark" | "onSurface"

const toneClass: Record<BackNavTone, string> = {
  // Header chrome (editor + home): idles in muted chrome text and washes toward
  // the chrome hover surface, matching the sibling File/Share controls.
  onDark:
    "text-[color:var(--apollon-chrome-text-muted)] hover:bg-[var(--apollon-chrome-surface-hover)] hover:text-[color:var(--apollon-chrome-text)] active:bg-[var(--apollon-chrome-surface-active)]",
  // Light popover surface (editor mobile menu).
  onSurface:
    "text-[color:var(--apollon-chrome-text)] hover:bg-[var(--apollon-chrome-surface-hover)] active:bg-[var(--apollon-chrome-surface-active)]",
}

/**
 * The single back/dashboard affordance shared by the editor navbar and the
 * chrome (legal/404) navbar, so the two can never drift in label or behavior.
 * Renders a real router <Link> (anchor) so cmd/middle-click opens a new tab and
 * the browser/native history stays coherent.
 */
type BackNavProps = BackTarget & {
  tone?: BackNavTone
  /** Fired in addition to navigating — e.g. to close the mobile menu it lives in. */
  onNavigate?: () => void
  className?: string
  /** Classes for the label span — e.g. `"hidden lg:inline"` to collapse to the
   * chevron on the narrow editor bar. The chevron alone stays a clear back cue,
   * and `aria-label` keeps it accessible when the text is hidden. */
  labelClassName?: string
}

export const BackNav = ({
  label,
  tone = "onDark",
  onNavigate,
  className,
  labelClassName,
  ...target
}: BackNavProps) => (
  <Link
    {...target}
    onClick={onNavigate}
    aria-label={label}
    className={cn(
      "inline-flex min-h-[var(--apollon-chrome-btn)] items-center gap-1 whitespace-nowrap rounded-[var(--apollon-chrome-radius-sm)] px-2 py-1 text-sm font-medium transition-colors focus-visible:shadow-[0_0_0_2px_color-mix(in_srgb,var(--apollon-chrome-accent)_45%,transparent)] focus-visible:outline-none",
      toneClass[tone],
      className
    )}
  >
    <svg
      className="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span className={labelClassName}>{label}</span>
  </Link>
)
