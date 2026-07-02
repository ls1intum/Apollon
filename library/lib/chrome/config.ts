import type { ReactNode } from "react"
import type { OverlayControlOptions } from "@/overlay/types"

/**
 * Public configuration for the editor's own built-in controls.
 *
 * Every built-in (the element palette, the minimap, the zoom / history cluster)
 * is a first-class overlay control under a reserved id. This config is the ONE
 * shape a consumer uses to hide, move, re-style, re-configure, or replace them —
 * byte-identical between the imperative `ApollonEditor` (`options.controls`,
 * `editor.setControls`) and the React `<Apollon controls={…}>`. Arbitrary custom
 * controls still go through `addControl` / `<ApollonControl>`; this covers only
 * the built-ins.
 */

/** The editor's built-in controls, addressable by a stable key. */
export type BuiltInControlKey = "palette" | "minimap" | "zoom"

/**
 * Placement / appearance a consumer may override on a built-in. Reuses the
 * {@link OverlayControlOptions} vocabulary verbatim — the engine owns the
 * reserved `id` and the default `render`.
 */
export type ControlPlacement = Partial<
  Pick<
    OverlayControlOptions,
    | "region"
    | "order"
    | "inset"
    | "interactive"
    | "visible"
    | "className"
    | "style"
  >
>

/**
 * Config for a single built-in, at three levels of intent:
 * - `false` — hide it (unregistered; reserves no room). `true` / omitted keeps
 *   the default.
 * - a {@link ControlPlacement} object — keep the default control, re-placed /
 *   re-ordered / re-styled, and optionally re-configured via `props`.
 * - `{ render }` — replace the default renderer entirely (rendered inside the
 *   same slot, so it inherits pan/zoom blocking, focus order, and inset
 *   measurement).
 */
export type BuiltInControlConfig<P = unknown> =
  | boolean
  | (ControlPlacement & {
      /** Options forwarded to the DEFAULT control (ignored when `render` set). */
      props?: Partial<P>
      /** Replace the default body. */
      render?: () => ReactNode
    })

/** Tunables for the built-in element palette (reserved; none yet). */
export type PaletteProps = Record<never, never>

/** Tunables for the built-in minimap. */
export interface MinimapProps {
  /** Drag the minimap to pan the diagram. Default `true`. */
  pannable?: boolean
  /** Scroll over the minimap to zoom the diagram. Default `true`. */
  zoomable?: boolean
}

/** Tunables for the built-in zoom / history cluster. */
export interface ZoomProps {
  /** Show the zoom-out / zoom-in / fit buttons + %-readout. Default `true`. */
  showZoom?: boolean
  /** Show the undo / redo buttons (when an undo manager exists). Default `true`. */
  showHistory?: boolean
}

/**
 * The `controls` option on `ApollonOptions` / `<Apollon>`. Anything omitted
 * keeps the editor default.
 */
export interface ControlsOptions {
  palette?: BuiltInControlConfig<PaletteProps>
  minimap?: BuiltInControlConfig<MinimapProps>
  zoom?: BuiltInControlConfig<ZoomProps>
}
