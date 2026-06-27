import { Island, IslandInput } from "./islandPrimitives"

/**
 * Pure presentational diagram-title field — the quiet document-identity capsule
 * at the top-center of the editor header (a borderless field on the glass
 * surface; the island itself is the input chrome). Props in, callbacks out: it
 * holds no editor/store wiring, so every visual state is reachable from props
 * alone and it stories with zero providers. The container `HeaderTitleIsland`
 * pairs it with {@link useDiagramTitle}.
 */
export function HeaderTitleField({
  value,
  onValueChange,
  placeholder = "Untitled diagram",
}: {
  /** Current title text. */
  value: string
  /** Called with the next title text on every keystroke. */
  onValueChange: (value: string) => void
  /** Placeholder shown (and used to size) an empty field. */
  placeholder?: string
}) {
  return (
    // The title island is sized to the TITLE TEXT (`w-fit` + the input's `size`),
    // not the track — a short name gets a short field, growing as you type up to
    // the 560px cap (then the text scrolls). It sits LEFT-aligned with the rest of
    // the track open to its right.
    <Island
      className="apollon-chrome-title-island w-fit"
      style={{ maxWidth: "560px" }}
    >
      <IslandInput
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        // "title" not "name" so it doesn't collide with the template dialog's
        // "Name" field under getByLabel('Name') in the e2e suite.
        aria-label="Diagram title"
        // `size` grows the field with the text length (the empty field fits the
        // placeholder); a 12-char floor keeps short titles comfortably clickable.
        // `max-w-full` caps it to the island's 560px so a very long title scrolls
        // rather than overflowing.
        size={Math.max(12, (value || placeholder).length + 2)}
        className="min-w-0 max-w-full"
      />
    </Island>
  )
}
