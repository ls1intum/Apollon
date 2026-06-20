import { Link } from "@tanstack/react-router"
import type { BackTarget } from "@/hooks/useBackTarget"
import { cn } from "@/lib/utils"

type BackNavTone = "onDark" | "onSurface"

const toneClass: Record<BackNavTone, string> = {
  // Dark navbar (editor desktop bar + chrome home navbar). #a3a6a8 mirrors the
  // `secondary` token used by the sibling File/Share controls.
  onDark:
    "text-[#a3a6a8] hover:bg-white/10 hover:text-white focus-visible:outline-white",
  // Light popover surface (editor mobile menu).
  onSurface:
    "text-[var(--apollon-primary-contrast)] hover:bg-[var(--apollon-background-variant)] focus-visible:outline-[var(--apollon-primary-contrast)]",
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
      "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
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
