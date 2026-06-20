import { formatAnchor, parseAnchor, type Side } from "./anchorModel"

/**
 * Map a legacy handle id (the pre-anchor-model named slots, e.g. "top",
 * "top-left", "right-mid-bottom", "bottom-between-center-mid-left") to a
 * canonical `side:ratio` anchor.
 *
 * The legacy model used a fixed 9-slot-per-side layout; slot index i maps to
 * ratio i/8. Corners migrate to TRUE corners (0.0 / 1.0), dropping the old
 * [0.2,0.8] cosmetic band. Anything unrecognised falls back to the centre of
 * its detected side — never dropped — so every saved edge keeps resolving.
 *
 * Idempotent: ids already in `side:ratio` form pass through unchanged.
 */

// Slot ratios for the nine positions of a side, in the legacy declaration order.
const SLOT_RATIOS = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1] as const

// Legacy 9-slot id order per side (verbatim from the old SIDE_HANDLE_IDS).
const LEGACY_SIDE_SLOTS: Record<Side, string[]> = {
  t: [
    "top-left",
    "top-between-left-mid-left",
    "top-mid-left",
    "top-between-mid-left-center",
    "top",
    "top-between-center-mid-right",
    "top-mid-right",
    "top-between-mid-right-right",
    "top-right",
  ],
  r: [
    "right-top",
    "right-between-top-mid-top",
    "right-mid-top",
    "right-between-mid-top-center",
    "right",
    "right-between-center-mid-bottom",
    "right-mid-bottom",
    "right-between-mid-bottom-bottom",
    "right-bottom",
  ],
  b: [
    "bottom-left",
    "bottom-between-mid-left-left",
    "bottom-mid-left",
    "bottom-between-center-mid-left",
    "bottom",
    "bottom-between-mid-right-center",
    "bottom-mid-right",
    "bottom-between-right-mid-right",
    "bottom-right",
  ],
  l: [
    "left-top",
    "left-between-mid-top-top",
    "left-mid-top",
    "left-between-center-mid-top",
    "left",
    "left-between-mid-bottom-center",
    "left-mid-bottom",
    "left-between-bottom-mid-bottom",
    "left-bottom",
  ],
}

const buildLegacyMap = (): Map<string, string> => {
  const map = new Map<string, string>()
  for (const side of ["t", "r", "b", "l"] as Side[]) {
    LEGACY_SIDE_SLOTS[side].forEach((legacyId, index) => {
      map.set(legacyId, formatAnchor(side, SLOT_RATIOS[index]))
    })
  }
  return map
}

const LEGACY_MAP = buildLegacyMap()

const detectSide = (id: string): Side | null => {
  if (id.startsWith("top")) return "t"
  if (id.startsWith("bottom")) return "b"
  if (id.startsWith("left")) return "l"
  if (id.startsWith("right")) return "r"
  return null
}

/** Convert a legacy handle id to a canonical `side:ratio` anchor id. */
export function migrateLegacyHandle(handle: string | null | undefined): string {
  if (!handle) return formatAnchor("t", 0.5)

  // Already an anchor id → leave untouched (idempotent).
  if (parseAnchor(handle)) return handle

  const mapped = LEGACY_MAP.get(handle)
  if (mapped) return mapped

  // Unknown id: keep the edge alive by snapping to the centre of its side
  // (or the top-centre if even the side can't be determined).
  const side = detectSide(handle) ?? "t"
  return formatAnchor(side, 0.5)
}
