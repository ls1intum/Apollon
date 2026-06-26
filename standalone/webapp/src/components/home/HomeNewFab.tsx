import { Plus } from "lucide-react"

/**
 * Mobile "New diagram" action (< md only). The desktop band carries the accent
 * "New diagram" button; on a phone the primary action moves to a thumb-reachable
 * bottom-center floating pill (a `+` icon plus an explicit label, never a bare
 * glyph). Statically pinned, clear of the home-indicator via
 * `--apollon-chrome-edge-safe-bottom`, ≥44px tall for the touch target.
 */
export function HomeNewFab({ onNewDiagram }: { onNewDiagram?: () => void }) {
  return (
    <button
      type="button"
      onClick={onNewDiagram}
      aria-label="New diagram"
      className="apollon-chrome-accent-btn apollon-glass fixed bottom-[var(--apollon-chrome-edge-safe-bottom)] left-1/2 z-30 inline-flex h-12 -translate-x-1/2 cursor-pointer items-center justify-center gap-2 rounded-full border-0 pr-5 pl-4 text-sm font-semibold transition-transform active:scale-95 focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--apollon-chrome-accent)_50%,transparent)] focus-visible:outline-none md:hidden"
    >
      <Plus className="size-5" aria-hidden />
      New diagram
    </button>
  )
}
