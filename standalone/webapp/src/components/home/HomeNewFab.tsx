import { Plus } from "lucide-react"

/**
 * Mobile "New diagram" FAB (< md only). The desktop band carries an explicit
 * accent "New diagram" button; on a phone that primary action moves to a
 * thumb-reachable bottom-center floating action button.
 *
 * STATICALLY pinned — no scroll listener — at the bottom-center, clear of the
 * home-indicator via `--apollon-chrome-edge-safe-bottom`. It paints the same
 * `.apollon-glass` material as the band, tinted with the chrome accent so it
 * reads as the primary action.
 */
export function HomeNewFab({ onNewDiagram }: { onNewDiagram?: () => void }) {
  return (
    <button
      type="button"
      onClick={onNewDiagram}
      aria-label="New diagram"
      title="New diagram"
      className="apollon-glass fixed bottom-[var(--apollon-chrome-edge-safe-bottom)] left-1/2 z-30 inline-flex size-14 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border-0 transition-transform active:scale-95 focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--apollon-chrome-accent)_50%,transparent)] focus-visible:outline-none md:hidden"
      style={{
        background: "var(--apollon-chrome-accent)",
        color: "var(--apollon-chrome-accent-contrast)",
      }}
    >
      <Plus className="size-6" aria-hidden />
    </button>
  )
}
