import { XIcon } from "lucide-react"
import type { HomeChrome } from "./useHomeChrome"

/**
 * The removable-chip line, flush under the Home Island Band whenever any
 * refinement is active (`activeRefinements` non-empty). One chip per active facet
 * with an inline "×" that resets just that facet; a trailing "Clear all" resets
 * everything.
 *
 * Rides a single `apollon-glass` plate (a labelled `role="group"`). Below `md`
 * the plate spans full width and the chips WRAP onto as many rows as needed (no
 * horizontal scroll, so a phone can surface all facets at once); at `md+` it
 * collapses to a content-sized single row. Each chip is a single `<button>` (no
 * nested interactives), its label `truncate`d under a per-chip `max-w` so even
 * the long sort chip never overruns the narrowest phone plate. The chips paint on
 * the chrome surface tokens, not the `bg-secondary` Badge material, so they read
 * as the same floating-glass grammar as the band in light and dark.
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
      className="apollon-glass flex w-full flex-wrap items-center gap-[var(--apollon-chrome-gap)] p-[var(--apollon-chrome-pad)] md:inline-flex md:w-fit md:flex-nowrap"
      style={{
        maxWidth: "100%",
        borderRadius: "var(--apollon-chrome-radius-lg)",
      }}
    >
      {activeRefinements.map((refinement) => (
        <button
          key={refinement.key}
          type="button"
          onClick={refinement.clear}
          aria-label={`Remove ${refinement.label} filter`}
          className="inline-flex min-h-9 max-w-[min(100%,14rem)] min-w-0 cursor-pointer items-center gap-1 rounded-[var(--apollon-chrome-radius-sm)] border border-[color:var(--apollon-chrome-border)] bg-[var(--apollon-chrome-surface-hover)] px-2.5 text-xs font-medium text-[color:var(--apollon-chrome-text)] transition-colors hover:bg-[var(--apollon-chrome-surface-active)] focus-visible:shadow-[0_0_0_2px_color-mix(in_srgb,var(--apollon-chrome-accent)_45%,transparent)] focus-visible:outline-none"
        >
          <span className="min-w-0 truncate">{refinement.label}</span>
          <XIcon className="size-3 shrink-0 opacity-70" aria-hidden />
        </button>
      ))}
      <button
        type="button"
        onClick={chrome.resetAll}
        className="inline-flex min-h-9 cursor-pointer items-center rounded-[var(--apollon-chrome-radius-sm)] px-2 text-xs font-medium whitespace-nowrap text-[color:var(--apollon-chrome-text)] transition-colors hover:bg-[var(--apollon-chrome-surface-hover)] focus-visible:shadow-[0_0_0_2px_color-mix(in_srgb,var(--apollon-chrome-accent)_45%,transparent)] focus-visible:outline-none"
      >
        Clear all
      </button>
    </div>
  )
}
