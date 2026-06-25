import { XIcon } from "lucide-react"
import { Badge } from "@tumaet/ui/components/badge"
import type { HomeChrome } from "./useHomeChrome"

/**
 * The removable-chip line that sits FLUSH under the Home Island Band whenever
 * any refinement is active (`refineCount > 0`, OR favorites is on — i.e.
 * `activeRefinements` is non-empty). One chip per active facet, each with an
 * inline "×" that resets just that facet; a trailing "Clear all" resets every
 * refinement at once.
 *
 * The whole row rides a single `apollon-glass` plate (a labelled `role="group"`
 * region) sized to its content, so the chips read as the same floating-island
 * material as the band and "Clear all" stays legible over the scrolling cards.
 * Horizontally scrollable on mobile (chips never wrap to a second row), and each
 * chip is a single `<button>` (a secondary `Badge`) so there are no nested
 * interactives for the a11y gate to flag.
 */
export function HomeRefinementChips({ chrome }: { chrome: HomeChrome }) {
  const { activeRefinements } = chrome

  if (activeRefinements.length === 0) {
    return null
  }

  return (
    <div
      role="group"
      aria-label="Active filters"
      className="apollon-glass inline-flex items-center gap-1.5 overflow-x-auto px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{
        width: "fit-content",
        maxWidth: "100%",
        borderRadius: "var(--apollon-chrome-radius-lg)",
      }}
    >
      {activeRefinements.map((refinement) => (
        <Badge
          key={refinement.key}
          render={
            <button
              type="button"
              onClick={refinement.clear}
              aria-label={`Remove ${refinement.label} filter`}
            />
          }
          variant="secondary"
          className="min-h-9 shrink-0 cursor-pointer gap-1 px-2.5 transition-colors hover:bg-secondary/80 focus-visible:shadow-[0_0_0_2px_color-mix(in_srgb,var(--apollon-chrome-accent)_45%,transparent)] focus-visible:outline-none"
        >
          <span>{refinement.label}</span>
          <XIcon className="size-3 opacity-70" aria-hidden />
        </Badge>
      ))}
      <button
        type="button"
        onClick={chrome.resetAll}
        className="ml-0.5 inline-flex min-h-9 shrink-0 cursor-pointer items-center rounded-full px-2 text-xs font-medium transition-colors focus-visible:shadow-[0_0_0_2px_color-mix(in_srgb,var(--apollon-chrome-accent)_45%,transparent)] focus-visible:outline-none"
        style={{ color: "var(--apollon-chrome-text)" }}
      >
        Clear all
      </button>
    </div>
  )
}
