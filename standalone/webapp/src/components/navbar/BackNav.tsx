import { Link } from "@tanstack/react-router"
import { ChevronLeft } from "lucide-react"
import { cn } from "@tumaet/ui/lib/utils"
import type { BackTarget } from "@/hooks/useBackTarget"

type BackNavTone = "onDark" | "onSurface"

const toneClass: Record<BackNavTone, string> = {
  // Header chrome (editor + home): idles in solid foreground and washes toward
  // the chrome hover surface, matching the sibling File/Share controls.
  onDark:
    "text-foreground hover:bg-[var(--apollon-chrome-surface-hover)] active:bg-[var(--apollon-chrome-surface-active)]",
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
    <ChevronLeft className="size-4 shrink-0" aria-hidden />
    <span className={labelClassName}>{label}</span>
  </Link>
)
