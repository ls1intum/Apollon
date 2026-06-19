/**
 * Layout math for the floating element palette. The palette is an overlay on
 * the canvas (all viewports — there is no docked variant), so it must lay every
 * element out in a grid that fits the available canvas WITHOUT scrolling, with
 * previews as large as is reasonable. The precedence, borrowed from drawing
 * tools that solve the same "many tools, little room" problem, is:
 *   wrap into more columns  →  shrink the cell  →  (rarely) scroll.
 *
 * Cells are rectangular (the dominant elements — class boxes, BPMN tasks — are
 * ~1.6:1 wide); narrower/square elements letterbox centered inside. Sizing the
 * cell, not the SVG, keeps the node components untouched.
 */
export const PALETTE = Object.freeze({
  /** HIG/WCAG touch + legibility floor — never shrink a cell past this. */
  CELL_MIN_H: 44,
  /** "Bigger than before" cap; also keeps the palette from dominating. */
  CELL_MAX_H: 72,
  CELL_STEP: 4,
  /** cellW = round(CELL_RATIO * cellH); ~matches the 160×100 class box. */
  CELL_RATIO: 1.6,
  GAP: 8,
  PAD: 6,
  /** The palette may occupy at most this fraction of the canvas. */
  MAX_FRAC_W: 0.55,
  MAX_FRAC_H: 0.8,
  /** Letterbox padding around the preview inside a cell. */
  CONTENT_INSET: 6,
  /** Space kept clear above (top offset) and below (zoom controls) the palette. */
  TOP_RESERVE: 10,
  BOTTOM_RESERVE: 84,
} as const)

export interface PaletteLayout {
  cols: number
  cellW: number
  cellH: number
  /** True only in the rare case all items can't fit even at the floor size. */
  scroll: boolean
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

/**
 * @param itemCount total grid cells (drag elements + the color-description cell)
 * @param availW    measured canvas width
 * @param availH    measured canvas height
 * @param chromeH   height of non-grid palette chrome (view switch / hint), 0 if none
 */
export function computePaletteLayout(
  itemCount: number,
  availW: number,
  availH: number,
  chromeH: number
): PaletteLayout {
  const p = PALETTE
  const floorCellW = Math.round(p.CELL_RATIO * p.CELL_MIN_H)
  if (itemCount <= 0 || availW <= 0 || availH <= 0) {
    return { cols: 1, cellW: floorCellW, cellH: p.CELL_MIN_H, scroll: false }
  }

  const budgetW = availW * p.MAX_FRAC_W
  // Honor both the fraction cap and the physical room left once the top offset
  // and the bottom zoom-controls reserve are removed.
  const budgetH = Math.min(
    availH * p.MAX_FRAC_H,
    availH - p.TOP_RESERVE - p.BOTTOM_RESERVE
  )

  for (let cellH = p.CELL_MAX_H; cellH >= p.CELL_MIN_H; cellH -= p.CELL_STEP) {
    const cellW = Math.round(p.CELL_RATIO * cellH)
    const maxCols = Math.max(1, Math.floor((budgetW + p.GAP) / (cellW + p.GAP)))
    const rowsBudget = budgetH - chromeH - 2 * p.PAD
    const maxRows = Math.max(
      1,
      Math.floor((rowsBudget + p.GAP) / (cellH + p.GAP))
    )
    // Fewest columns whose row count fits the height — prefer a tall, narrow
    // card over a wide bar — bounded by what the width allows.
    const cols = clamp(
      Math.ceil(itemCount / maxRows),
      1,
      Math.min(maxCols, itemCount)
    )
    const rows = Math.ceil(itemCount / cols)
    const blockW = cols * cellW + (cols - 1) * p.GAP + 2 * p.PAD
    const blockH = rows * cellH + (rows - 1) * p.GAP + 2 * p.PAD + chromeH
    if (blockW <= budgetW && blockH <= budgetH) {
      return { cols, cellW, cellH, scroll: false }
    }
  }

  // Even at the floor it doesn't fit: pack as wide as the width allows and let
  // it scroll (the deliberate last resort — never shrink below the floor).
  const maxCols = Math.max(
    1,
    Math.floor((budgetW + p.GAP) / (floorCellW + p.GAP))
  )
  return {
    cols: Math.min(maxCols, itemCount),
    cellW: floorCellW,
    cellH: p.CELL_MIN_H,
    scroll: true,
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
  cellH: number
): number {
  const inset = 2 * PALETTE.CONTENT_INSET
  return Math.min(
    (cellW - inset) / naturalWidth,
    (cellH - inset) / naturalHeight
  )
}
