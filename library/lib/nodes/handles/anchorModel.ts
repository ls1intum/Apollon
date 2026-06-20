import { Position } from "@xyflow/react"

/**
 * anchorModel — the single source of truth for connection-point geometry.
 *
 * A connection endpoint is persisted as a `side:ratio` anchor (e.g. `t:0.500`):
 *   - `side`  one of the four rectangle sides (t/r/b/l)
 *   - `ratio` the fraction along that side (0 = start corner, 1 = end corner),
 *             quantized to the 5px canvas grid.
 *
 * This replaces the legacy fixed 9-slot / staged-arc model. It is pure (no
 * React, no DOM) so the same math drives the interactive handles, the
 * connect/reconnect snapping, the grid-ghost overlay, and any headless export.
 *
 * The grid step is hard-coded to avoid a known circular import
 *   constants.ts → @/nodes → … → @/utils → edgeUtils.ts → @/constants
 * Keep GRID_STEP_PX in sync with CANVAS.SNAP_TO_GRID_PX (currently 5).
 */

export type Side = "t" | "r" | "b" | "l"
export const SIDES: readonly Side[] = ["t", "r", "b", "l"]

export type AnchorKind = "center" | "corner" | "quarter" | "grid"

export interface Anchor {
  side: Side
  ratio: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

// Match the canvas grid step (CANVAS.SNAP_TO_GRID_PX). Anchors quantize to this
// so a node dragged on the grid keeps its edges perfectly grid-aligned.
export const GRID_STEP_PX = 5

// A side gains its two quarter handles once it is at least this long, so small
// nodes stay uncluttered (3 key handles) while large nodes expose 5.
export const QUARTER_THRESHOLD_PX = 120

// Minimum comfortable on-screen spacing between two adjacent draggable points.
// Drives the zoom-aware grid level of detail.
const MIN_TARGET_SPACING_PX = 12

// Base on-screen snap radius (at zoom >= 1) and its cap when zoomed out.
const SNAP_RADIUS_BASE_PX = 14
const SNAP_RADIUS_MAX_PX = 30

const KEY_RATIOS_BASE: readonly number[] = [0, 0.5, 1]
const KEY_RATIOS_LONG: readonly number[] = [0, 0.25, 0.5, 0.75, 1]

export const SIDE_TO_POSITION: Record<Side, Position> = {
  t: Position.Top,
  r: Position.Right,
  b: Position.Bottom,
  l: Position.Left,
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

const clamp01 = (value: number): number => clamp(value, 0, 1)

export const safeZoom = (zoom: number): number =>
  Number.isFinite(zoom) && zoom > 0 ? zoom : 1

const isSide = (value: string): value is Side =>
  value === "t" || value === "r" || value === "b" || value === "l"

/**
 * Format a ratio to the canonical 3-decimal string ("0.000" … "1.000").
 *
 * Three decimals (not two) so a grid-snapped ratio round-trips back onto the
 * 5px grid for any realistic node size: the rounding error is ≤ 0.0005, i.e.
 * < 2.5px (half a grid step) for axes up to ~5000px. With two decimals the
 * error reaches a full 5px cell on nodes wider than ~200px (common class
 * boxes), shifting endpoints and making re-saves non-idempotent.
 */
export function formatRatio(ratio: number): string {
  return clamp01(ratio).toFixed(3)
}

/** Build a canonical anchor id, e.g. `formatAnchor("t", 0.5)` → "t:0.500". */
export function formatAnchor(side: Side, ratio: number): string {
  return `${side}:${formatRatio(ratio)}`
}

/** Parse a `side:ratio` id. Returns null for anything that isn't one. */
export function parseAnchor(id: string | null | undefined): Anchor | null {
  if (!id) return null
  const colon = id.indexOf(":")
  if (colon !== 1) return null
  const side = id.slice(0, 1)
  if (!isSide(side)) return null
  const tail = id.slice(colon + 1)
  // `Number("")` is 0 — reject an empty ratio so a truncated id ("b:") routes
  // through migration instead of silently resolving to the corner.
  if (tail.trim() === "") return null
  const ratio = Number(tail)
  if (!Number.isFinite(ratio)) return null
  return { side, ratio: clamp01(ratio) }
}

const kindForRatio = (ratio: number): AnchorKind => {
  if (ratio === 0.5) return "center"
  if (ratio === 0 || ratio === 1) return "corner"
  return "quarter"
}

/** Ratios of the always-rendered KEY handles for a side of the given length. */
export function keyRatiosForSide(axisPx: number): number[] {
  return axisPx >= QUARTER_THRESHOLD_PX
    ? [...KEY_RATIOS_LONG]
    : [...KEY_RATIOS_BASE]
}

export interface KeyHandle {
  ratio: number
  kind: AnchorKind
}

/** KEY handles (ratio + semantic kind) for a side of the given length. */
export function keyHandlesForSide(axisPx: number): KeyHandle[] {
  return keyRatiosForSide(axisPx).map((ratio) => ({
    ratio,
    kind: kindForRatio(ratio),
  }))
}

/**
 * Snap a ratio to the 5px world grid for the given side length. Because node
 * sizes and origins are 5px-snapped, `ratio * axisPx` lands on the global grid
 * with no drift.
 */
export function quantizeRatio(ratio: number, axisPx: number): number {
  if (!Number.isFinite(axisPx) || axisPx <= 0) return clamp01(ratio)
  const snappedPx =
    Math.round((clamp01(ratio) * axisPx) / GRID_STEP_PX) * GRID_STEP_PX
  return clamp(snappedPx, 0, axisPx) / axisPx
}

/**
 * World-space grid step the ghost overlay reveals and snaps to at a given zoom.
 * Always a multiple of GRID_STEP_PX; coarsens when zoomed out so adjacent ticks
 * never fall below MIN_TARGET_SPACING_PX on screen. The finest 5px grid engages
 * at zoom ≥ MIN_TARGET_SPACING_PX / (GRID_STEP_PX) (= 2.4x within the 2.5 cap).
 */
export function effectiveStepPx(zoom: number): number {
  const z = safeZoom(zoom)
  return (
    GRID_STEP_PX *
    Math.max(1, Math.ceil(MIN_TARGET_SPACING_PX / (GRID_STEP_PX * z)))
  )
}

/**
 * On-screen snap radius (constant feel at zoom ≥ 1, growing to a cap when
 * zoomed out). Convert to world units by dividing by zoom.
 */
export function snapRadiusScreenPx(zoom: number): number {
  const z = safeZoom(zoom)
  return clamp(
    SNAP_RADIUS_BASE_PX / Math.min(z, 1),
    SNAP_RADIUS_BASE_PX,
    SNAP_RADIUS_MAX_PX
  )
}

function snapRadiusWorldPx(zoom: number): number {
  return snapRadiusScreenPx(zoom) / safeZoom(zoom)
}

// On-screen length of an arc indicator. Two adjacent visible arcs need centres
// at least this far apart on screen, otherwise they overlap.
const ARC_ON_SCREEN_PX = 28

/**
 * Which KEY ratios render a visible arc on a side at the current zoom. The slot
 * positions never move — we just show fewer arcs when zoomed out so they don't
 * overlap, dropping quarters first, then corners, always keeping the centre:
 *   [0, .25, .5, .75, 1]  →  [0, .5, 1]  →  [.5]
 */
export function visibleKeyRatios(axisPx: number, zoom: number): number[] {
  const z = safeZoom(zoom)
  const fits = (count: number): boolean =>
    (axisPx / (count - 1)) * z >= ARC_ON_SCREEN_PX
  if (keyRatiosForSide(axisPx).length === 5 && fits(5))
    return [0, 0.25, 0.5, 0.75, 1]
  if (fits(3)) return [0, 0.5, 1]
  return [0.5]
}

/** World-space point of an anchor on a rectangle. */
export function anchorPoint(rect: Rect, side: Side, ratio: number): Point {
  const r = clamp01(ratio)
  switch (side) {
    case "t":
      return { x: rect.x + r * rect.width, y: rect.y }
    case "b":
      return { x: rect.x + r * rect.width, y: rect.y + rect.height }
    case "l":
      return { x: rect.x, y: rect.y + r * rect.height }
    case "r":
      return { x: rect.x + rect.width, y: rect.y + r * rect.height }
  }
}

/**
 * World-space point of an anchor on the ellipse inscribed in `rect`. The
 * rectangle-border point is projected from the centre onto the ellipse, so the
 * same `side:ratio` model drives both rectangular and elliptical nodes.
 */
export function ellipseAnchorPoint(
  rect: Rect,
  side: Side,
  ratio: number
): Point {
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  const rx = rect.width / 2
  const ry = rect.height / 2
  if (rx <= 0 || ry <= 0) return { x: cx, y: cy }

  const border = anchorPoint(rect, side, ratio)
  const ux = border.x - cx
  const uy = border.y - cy
  if (ux === 0 && uy === 0) return { x: cx, y: cy }

  const t = 1 / Math.sqrt((ux / rx) ** 2 + (uy / ry) ** 2)
  return { x: cx + ux * t, y: cy + uy * t }
}

const axisLengthForSide = (rect: Rect, side: Side): number =>
  side === "t" || side === "b" ? rect.width : rect.height

/**
 * The corner points (ratio 0 and 1) are shared by two sides but owned by the
 * horizontal ones, so each corner renders a single handle instead of two
 * overlapping arcs from a top/bottom AND a left/right side. Vertical sides
 * therefore never emit a corner ratio.
 */
export const sideOwnsCorners = (side: Side): boolean =>
  side === "t" || side === "b"

/** Raw (un-snapped) ratio of the perpendicular projection of `point` onto a side. */
const projectRatio = (rect: Rect, side: Side, point: Point): number => {
  if (side === "t" || side === "b") {
    return rect.width > 0 ? clamp01((point.x - rect.x) / rect.width) : 0
  }
  return rect.height > 0 ? clamp01((point.y - rect.y) / rect.height) : 0
}

export interface SnapOptions {
  /** Connectable sides (default all four). */
  sides?: readonly Side[]
  /** "center" exposes only the side centre (NSEW shapes); "key" the full set. */
  variant?: "key" | "center"
  /** Drop the corner ratios 0 and 1 (e.g. fork bars). */
  excludeCorners?: boolean
}

export interface SnapResult {
  side: Side
  ratio: number
  kind: AnchorKind
  id: string
  point: Point
}

const PRIORITY: Record<AnchorKind, number> = {
  center: 0,
  corner: 1,
  quarter: 2,
  grid: 3,
}

/** Candidate ratios on a side: key handles first, then the zoom grid. */
const candidateRatios = (
  rect: Rect,
  side: Side,
  zoom: number,
  opts: SnapOptions
): KeyHandle[] => {
  const axis = axisLengthForSide(rect, side)
  const candidates: KeyHandle[] = []

  if (opts.variant === "center") {
    candidates.push({ ratio: 0.5, kind: "center" })
  } else {
    const dropCorners = opts.excludeCorners || !sideOwnsCorners(side)
    for (const handle of keyHandlesForSide(axis)) {
      if (dropCorners && handle.kind === "corner") continue
      candidates.push(handle)
    }
    // Fine grid points (only where they don't coincide with a key ratio).
    if (axis > 0) {
      const step = effectiveStepPx(zoom)
      const keyRatios = new Set(candidates.map((c) => c.ratio))
      for (let px = 0; px <= axis + 1e-6; px += step) {
        const ratio = clamp01(px / axis)
        if (dropCorners && (ratio === 0 || ratio === 1)) continue
        if (!keyRatios.has(ratio)) candidates.push({ ratio, kind: "grid" })
      }
    }
  }
  return candidates
}

/**
 * Resolve a world-space point to the best anchor. Picks the nearest connectable side, then within the
 * zoom-scaled snap radius prefers higher-priority points
 * (center > corner > quarter > grid); falls back to the closest point on the
 * side so a drop ALWAYS resolves to a real anchor.
 */
export function snapToAnchor(
  rect: Rect,
  point: Point,
  zoom: number,
  opts: SnapOptions = {}
): SnapResult {
  const sides = opts.sides && opts.sides.length > 0 ? opts.sides : SIDES
  let side = sides[0]
  let sideDist = Number.POSITIVE_INFINITY
  for (const candidate of sides) {
    const p = anchorPoint(rect, candidate, projectRatio(rect, candidate, point))
    const d = Math.hypot(p.x - point.x, p.y - point.y)
    if (d < sideDist) {
      sideDist = d
      side = candidate
    }
  }

  const axis = axisLengthForSide(rect, side)
  const candidates = candidateRatios(rect, side, zoom, opts)
  const radius = snapRadiusWorldPx(zoom)

  let best: KeyHandle | null = null
  let bestDist = Number.POSITIVE_INFINITY
  let bestWithinRadius: KeyHandle | null = null
  let bestWithinPriority = Number.POSITIVE_INFINITY
  let bestWithinDist = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    const p = anchorPoint(rect, side, candidate.ratio)
    const d = Math.hypot(p.x - point.x, p.y - point.y)
    if (d < bestDist) {
      bestDist = d
      best = candidate
    }
    if (d <= radius) {
      const priority = PRIORITY[candidate.kind]
      if (
        priority < bestWithinPriority ||
        (priority === bestWithinPriority && d < bestWithinDist)
      ) {
        bestWithinPriority = priority
        bestWithinDist = d
        bestWithinRadius = candidate
      }
    }
  }

  const chosen = bestWithinRadius ??
    best ?? { ratio: 0.5, kind: "center" as const }
  // Key anchors keep their exact ratio (0, .25, .5, .75, 1) so the resolved id
  // matches the rendered key handle; only fine grid points are quantized.
  const ratio =
    chosen.kind === "grid" ? quantizeRatio(chosen.ratio, axis) : chosen.ratio
  return {
    side,
    ratio,
    kind: chosen.kind,
    id: formatAnchor(side, ratio),
    point: anchorPoint(rect, side, ratio),
  }
}
