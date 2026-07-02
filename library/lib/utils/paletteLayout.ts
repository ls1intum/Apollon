/**
 * Layout math for the floating element palette. The palette is an overlay on
 * the canvas (all viewports — there is no docked variant), so it must lay every
 * element out in a grid that fits the available canvas WITHOUT scrolling.
 *
 * Objective (in priority order):
 *   1. Use the FEWEST columns — a tall, narrow card preserves horizontal canvas
 *      space, which is what you actually draw in.
 *   2. Fill the available VERTICAL space — a single column down the side reads
 *      like a classic palette and wastes no height.
 *   3. Shrink the cells down to the `COMFORT_MIN_H` LEGIBILITY threshold BEFORE
 *      adding a column — but no smaller: below that, spill to another column so
 *      the node types stay distinguishable (rather than collapsing to an
 *      illegible sliver). Cap at `CELL_MAX_H` so they're never too large. The
 *      `CELL_MIN_H` touch floor is the last-resort fallback on a tiny canvas.
 *
 * So: walk column counts low→high and take the first one whose cells, sized to
 * fill the height (capped), are still at least the legibility threshold. One
 * column of legible cells is preferred over two columns of bigger ones; cells
 * shrink toward the legibility threshold first, and only spill to another column
 * when staying legible in fewer columns no longer fits the height.
 *
 * `availH` is the palette's REAL available band (the caller measures the space
 * between the palette's top and the bottom controls), so this math does NOT
 * re-subtract any top/bottom chrome reserve — it fills the band it is given.
 *
 * Cells are rectangular (the dominant elements — class boxes, BPMN tasks — are
 * ~1.6:1 wide); narrower/square elements letterbox centered inside. Sizing the
 * cell, not the SVG, keeps the node components untouched.
 */
export const PALETTE = Object.freeze({
  /** Absolute floor (HIG/WCAG touch) — only reached on a tiny canvas where even
   *  spilling to more columns can't keep cells legible; never shrink past it. */
  CELL_MIN_H: 44,
  /** Legibility threshold: shrink a column's cells down to here BEFORE adding
   *  another column, but spill (rather than go smaller) so the node types stay
   *  distinguishable. ~a comfortably legible node-preview cell. */
  COMFORT_MIN_H: 64,
  /** Upper bound so few-element palettes don't get absurdly tall cells;
   *  ~a 0.8-scale class-box preview. */
  CELL_MAX_H: 88,
  /** cellW = round(CELL_RATIO * cellH); ~matches the 160×100 class box. */
  CELL_RATIO: 1.6,
  GAP: 8,
  PAD: 6,
  /** Keep the palette horizontally narrow so the canvas keeps its width. */
  MAX_FRAC_W: 0.5,
  /** Letterbox padding around the preview inside a cell. */
  CONTENT_INSET: 6,
} as const)

/**
 * Mobile palettes should stay dense instead of expanding sparse element lists
 * to fill the available height. The 44px floor remains intact for touch, while
 * the lower comfort/cap sizes remove the large empty bands around previews.
 */
export const COMPACT_PALETTE = Object.freeze({
  CELL_MIN_H: 44,
  COMFORT_MIN_H: 52,
  // Capped tight: a capped grid can't shrink, and the CSS-clamped palette height
  // renders a few px under the JS-measured band, so a dense grid needs that slack
  // to avoid scrolling. Kept above COMFORT_MIN_H so cells stay legible.
  CELL_MAX_H: 56,
  CELL_RATIO: 1.6,
  GAP: 4,
  PAD: 4,
  MAX_FRAC_W: 0.5,
  CONTENT_INSET: 4,
} as const)

type PaletteMetrics = typeof PALETTE | typeof COMPACT_PALETTE

export interface PaletteLayout {
  cols: number
  cellW: number
  cellH: number
  /** True only in the rare case all items can't fit even at the floor size. */
  scroll: boolean
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

/** Largest cell height that fits `cols` columns of `count` items in the budget,
 *  filling the vertical space (capped) and bounded by the available width. */
function cellHeightFor(
  cols: number,
  count: number,
  budgetW: number,
  budgetH: number,
  chromeH: number,
  p: PaletteMetrics
): number {
  const rows = Math.ceil(count / cols)
  const fillH = (budgetH - chromeH - 2 * p.PAD - (rows - 1) * p.GAP) / rows
  const cellW = (budgetW - 2 * p.PAD - (cols - 1) * p.GAP) / cols
  const widthH = cellW / p.CELL_RATIO
  return Math.floor(Math.min(p.CELL_MAX_H, fillH, widthH))
}

/**
 * @param itemCount total grid cells (drag elements + the color-description cell)
 * @param availW    measured canvas width
 * @param availH    measured canvas height
 * @param chromeH   height of non-grid palette chrome (view switch / hint), 0 if none
 * @param compact   use denser mobile spacing and cell caps
 */
export function computePaletteLayout(
  itemCount: number,
  availW: number,
  availH: number,
  chromeH: number,
  compact = false
): PaletteLayout {
  const p = compact ? COMPACT_PALETTE : PALETTE
  const floorCellW = Math.round(p.CELL_RATIO * p.CELL_MIN_H)
  if (itemCount <= 0 || availW <= 0 || availH <= 0) {
    return { cols: 1, cellW: floorCellW, cellH: p.CELL_MIN_H, scroll: false }
  }

  const budgetW = availW * p.MAX_FRAC_W
  // `availH` is already the real available band (the caller subtracts the top
  // chrome + bottom controls), so use ALL of it — on EVERY viewport, including a
  // narrow phone in portrait: there the tall vertical space should read as one
  // legible column down the side, not a squat multi-column cluster. The column
  // walk below still spills to more columns only when one can't stay legible.
  const budgetH = availH
  const maxCols = Math.max(
    1,
    Math.min(itemCount, Math.floor((budgetW + p.GAP) / (floorCellW + p.GAP)))
  )

  // Fewest columns whose height-filling cells still clear the LEGIBILITY
  // threshold — so cells shrink toward legible (not the touch floor) before a
  // column is ever added; meanwhile remember the column count that yields the
  // biggest cell as a fallback for tiny canvases.
  let bestCols = 1
  let bestCellH = 0
  for (let cols = 1; cols <= maxCols; cols++) {
    const cellH = cellHeightFor(cols, itemCount, budgetW, budgetH, chromeH, p)
    if (cellH >= p.COMFORT_MIN_H) {
      return {
        cols,
        cellW: Math.round(p.CELL_RATIO * cellH),
        cellH,
        scroll: false,
      }
    }
    if (cellH > bestCellH) {
      bestCellH = cellH
      bestCols = cols
    }
  }

  // Nothing is comfortable (very constrained canvas): use the column count with
  // the biggest cell, clamp to the touch floor, and scroll only if even that
  // overflows — the deliberate last resort.
  const cellH = clamp(bestCellH, p.CELL_MIN_H, p.CELL_MAX_H)
  const rows = Math.ceil(itemCount / bestCols)
  const blockH = rows * cellH + (rows - 1) * p.GAP + 2 * p.PAD + chromeH
  return {
    cols: bestCols,
    cellW: Math.round(p.CELL_RATIO * cellH),
    cellH,
    scroll: blockH > budgetH + 1,
  }
}

/**
 * Preview scale that fits an element's natural size into a cell's content box.
 * Elements fill their cell (so they read "big"); wide boxes fit width, tall/
 * square nodes fit height and letterbox.
 */
export function previewScaleForCell(
  naturalWidth: number,
  naturalHeight: number,
  cellW: number,
  cellH: number,
  compact = false
): number {
  const metrics = compact ? COMPACT_PALETTE : PALETTE
  const inset = 2 * metrics.CONTENT_INSET
  return Math.min(
    (cellW - inset) / naturalWidth,
    (cellH - inset) / naturalHeight
  )
}
