import { type ReactNode, type CSSProperties } from "react"

/**
 * Where a control is anchored. The six React Flow `<Panel>` corners are
 * screen-space and rendered through React Flow; `header`/`left-rail`/`right-rail`
 * are library-owned bands; `on-canvas` pans/zooms with the diagram.
 */
export type OverlayRegion =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "header" // full-width band pinned to the container top, above top-* regions
  | "footer" // full-width band pinned to the container bottom, below bottom-* regions
  | "left-rail" // full-height left band (e.g. the element palette)
  | "right-rail" // full-height right band (e.g. version history)
  | "on-canvas" // viewport-transformed, pans + zooms with the diagram

/** Regions that map directly onto a React Flow `<Panel position>`. */
export const PANEL_REGIONS = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const

/** Every valid region — used to validate control registration at the API edge. */
export const OVERLAY_REGIONS: readonly OverlayRegion[] = [
  ...PANEL_REGIONS,
  "header",
  "footer",
  "left-rail",
  "right-rail",
  "on-canvas",
]

/** One of the four edges a control can sit against / reserve room on. */
export type OverlaySide = "top" | "right" | "bottom" | "left"
/** Reserved room per side, in px. */
export type Insets = Record<OverlaySide, number>
export const ZERO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 }

/**
 * How much room a control reserves so the diagram "makes way" (fed into
 * `fitView` padding, MapLibre-style). `"auto"` measures the control via the
 * shared ResizeObserver on the region's dominant axis; an object mixes explicit
 * px with per-side `"auto"` (e.g. `{ top: "auto" }`).
 */
export type InsetContribution =
  | "auto"
  | Partial<Record<OverlaySide, number | "auto">>

export interface OverlayControlOptions {
  /** Stable id. Re-adding the same id REPLACES (idempotent, StrictMode-safe). */
  id: string
  /** Which band/corner the control is anchored in. */
  region: OverlayRegion
  /** Reserve viewport room. Default: reserves nothing (the control floats). */
  inset?: InsetContribution
  /** Stacking within a region; lower renders toward the region's anchor edge. */
  order?: number
  /** When false the region frame stays pointer-transparent here too. Default true. */
  interactive?: boolean
  /** Wraps the control in a `role="group"` with this aria-label. No focus
   *  management is imposed. */
  groupLabel?: string
  /** Hide without unregistering (reserves no inset while hidden). Default true. */
  visible?: boolean
  /** The control positions itself (e.g. the React-Flow-native minimap renders its
   *  own `<Panel position>`), so the engine renders `render()` bare instead of
   *  wrapping it in a region slot. Reserves nothing. Default false. */
  selfPositioned?: boolean
  /** Extra class on the control's wrapper element. */
  className?: string
  /** Inline styles merged onto the control's wrapper element. */
  style?: CSSProperties
}

/** A control as stored in the registry: options plus the renderer.
 *  @internal Use {@link OverlayControlInput} as the public registration type. */
export interface OverlayControl extends OverlayControlOptions {
  render: () => ReactNode
}

/** The public registration payload (options + renderer). */
export type OverlayControlInput = OverlayControlOptions & {
  render: () => ReactNode
}
