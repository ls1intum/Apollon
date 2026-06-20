import { type ReactNode, type CSSProperties } from "react"
import * as Apollon from "../typings"

/**
 * Where a control is anchored. The six React Flow `<Panel>` corners/edge-centers
 * are screen-space and rendered through React Flow; the remaining regions are
 * library-owned bands (full-width header, full-height side rails, a non-interactive
 * in-front layer) plus `on-canvas`, which pans/zooms with the diagram.
 */
export type OverlayRegion =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "center-left"
  | "center-right"
  | "header" // full-width band pinned to the container top, above top-* regions
  | "left-rail" // full-height left band (e.g. the element palette)
  | "right-rail" // full-height right band (e.g. version history)
  | "in-front" // screen-space, full-bleed, non-interactive (guides, scroll hints)
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

export type OverlaySide = "top" | "right" | "bottom" | "left"
export type Insets = Record<OverlaySide, number>
export const ZERO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 }

/**
 * How much room a control reserves so the diagram "makes way" (fed into
 * `fitView` padding, MapLibre-style). `"auto"` measures the control via the
 * shared ResizeObserver on the region's dominant axis; an array auto-measures
 * exactly those sides; an object mixes explicit px with per-side `"auto"`.
 */
export type InsetContribution =
  | "auto"
  | OverlaySide[]
  | Partial<Record<OverlaySide, number | "auto">>

export type OverlayBreakpoint = "mobile" | "tablet" | "desktop"

export interface OverlayVisibilityState {
  mode: Apollon.ApollonMode
  view: Apollon.ApollonView
  readonly: boolean
  previewMode: boolean
  breakpoint: OverlayBreakpoint
}

export interface OverlayControlOptions {
  /** Stable id. Re-adding the same id REPLACES (idempotent, StrictMode-safe). */
  id: string
  region: OverlayRegion
  /** Reserve viewport room. Default: reserves nothing (the control floats). */
  inset?: InsetContribution
  /** Stacking within a region; lower renders toward the region's anchor edge. */
  order?: number
  /** When false the region frame stays pointer-transparent here too. Default true. */
  interactive?: boolean
  /** Wraps the panel as role="toolbar" with this aria-label + roving tabindex. */
  toolbarLabel?: string
  /** Hide without unregistering; a function recomputes on editor-state change. */
  visible?: boolean | ((s: OverlayVisibilityState) => boolean)
  className?: string
  style?: CSSProperties
}

/** A control as registered: options plus the renderer and bookkeeping. */
export interface OverlayControl extends OverlayControlOptions {
  source: "library" | "imperative" | "react"
  render: () => ReactNode
}

/** The public registration payload (options + renderer). */
export type OverlayControlInput = OverlayControlOptions & {
  render: () => ReactNode
}

/** Built-in library overlays, addressable for hide/replace via display options. */
export type LibraryOverlayName =
  | "palette"
  | "controls"
  | "minimap"
  | "presence"
  | "header"

/**
 * View-only display configuration (issue #749). Toggling these is exactly
 * hiding/replacing the corresponding library overlay control under the hood —
 * one mechanism, two ergonomics.
 */
export interface ApollonDisplayOptions {
  palette?: boolean
  controls?: boolean
  minimap?: boolean
  presence?: boolean
  /** Replace (fn) or hide (null) a built-in overlay; undefined keeps the default. */
  components?: Partial<Record<LibraryOverlayName, (() => ReactNode) | null>>
  /** Move a built-in overlay to a different region. */
  regions?: Partial<Record<LibraryOverlayName, OverlayRegion>>
}
