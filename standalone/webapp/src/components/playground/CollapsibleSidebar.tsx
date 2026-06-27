import { ChevronLeft, ChevronRight } from "lucide-react"
import clsx from "clsx"
import type { ReactNode } from "react"

const COLLAPSED_WIDTH = 44

// A side rail that collapses to a thin strip with a chevron toggle. The toggle
// button surface deliberately contrasts the aside surface so it stays visible
// on either background.
export const CollapsibleSidebar = ({
  side,
  width,
  open,
  onToggle,
  label,
  testId,
  surface = "base",
  children,
}: {
  side: "left" | "right"
  width: number
  open: boolean
  onToggle: () => void
  /** Used in the toggle's accessible name, e.g. "Expand {label}". */
  label: string
  testId: string
  surface?: "base" | "variant"
  children: ReactNode
}) => {
  const contentId = `${testId}-content`
  const Chevron = (side === "left") === open ? ChevronLeft : ChevronRight

  return (
    <aside
      data-testid={testId}
      className={clsx(
        "relative h-full shrink-0 overflow-hidden text-[var(--apollon-primary-contrast)] transition-[width] duration-200 ease-in-out border-[var(--apollon-gray)]",
        side === "left" ? "border-r" : "border-l",
        surface === "variant"
          ? "bg-[var(--apollon-background-variant)]"
          : "bg-[var(--apollon-background)]"
      )}
      style={{ width: open ? width : COLLAPSED_WIDTH }}
    >
      <button
        type="button"
        aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
        aria-expanded={open}
        // Only reference the content region while it's actually in the DOM.
        aria-controls={open ? contentId : undefined}
        onClick={onToggle}
        className={clsx(
          "absolute top-2 z-[1] flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[var(--apollon-gray)] hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--apollon-primary-contrast)]",
          side === "left" ? "right-1.5" : "left-1.5",
          surface === "variant"
            ? "bg-[var(--apollon-background)]"
            : "bg-[var(--apollon-background-variant)]"
        )}
      >
        <Chevron className="size-5" />
      </button>

      {open && (
        <div
          id={contentId}
          style={{ width }}
          className="box-border flex h-full flex-col gap-2 overflow-y-auto px-4 pb-4 pt-12"
        >
          {children}
        </div>
      )}
    </aside>
  )
}
