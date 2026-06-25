import { XIcon } from "lucide-react"
import type { HomeChrome } from "./useHomeChrome"

/**
 * The removable-chip line that sits FLUSH under the Home Island Band whenever
 * any refinement is active (`refineCount > 0`, OR favorites is on — i.e.
 * `activeRefinements` is non-empty). One chip per active facet, each with an
 * inline "×" that resets just that facet; a trailing "Clear all" resets every
 * refinement at once.
 *
 * Horizontally scrollable on mobile (chips never wrap to a second row), and each
 * chip is a single `<button>` so there are no nested interactives for the a11y
 * gate to flag.
 */
export function HomeRefinementChips({ chrome }: { chrome: HomeChrome }) {
  const { activeRefinements } = chrome

  if (activeRefinements.length === 0) {
    return null
  }

  return (
    <div
      aria-label="Active filters"
      className="flex items-center gap-1.5 overflow-x-auto pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {activeRefinements.map((refinement) => (
        <button
          key={refinement.key}
          type="button"
          onClick={refinement.clear}
          aria-label={`Remove ${refinement.label} filter`}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:shadow-[0_0_0_2px_color-mix(in_srgb,var(--apollon-chrome-accent)_45%,transparent)] focus-visible:outline-none"
          style={{
            background: "var(--apollon-chrome-surface-hover)",
            color: "var(--apollon-chrome-text)",
          }}
        >
          <span>{refinement.label}</span>
          <XIcon className="size-3 opacity-70" aria-hidden />
        </button>
      ))}
      <button
        type="button"
        onClick={chrome.resetAll}
        className="ml-0.5 shrink-0 cursor-pointer rounded-full px-2 py-1 text-xs font-medium transition-colors focus-visible:shadow-[0_0_0_2px_color-mix(in_srgb,var(--apollon-chrome-accent)_45%,transparent)] focus-visible:outline-none"
        style={{ color: "var(--apollon-chrome-text)" }}
      >
        Clear all
      </button>
    </div>
  )
}
