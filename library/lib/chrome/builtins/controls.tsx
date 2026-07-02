import type { PanelPosition } from "@xyflow/react"
import { Sidebar } from "@/components/Sidebar"
import { CustomMiniMap } from "@/components/CustomMiniMap"
import { useOverlayStore } from "@/store/context"
import type {
  OverlayControlInput,
  OverlayControlOptions,
} from "@/overlay/types"
import { ZoomControls } from "./ZoomControls"

/**
 * Framework-agnostic factories for the editor's built-in chrome. Each returns an
 * {@link OverlayControlInput} descriptor under a reserved id, so the built-ins are
 * the SAME registry records host controls use — registered via `editor.addControl`
 * (vanilla / imperative) or the `<Apollon.Palette|Zoom|MiniMap>` compound
 * components (React). Placement/appearance overrides ride the shared
 * {@link OverlayControlOptions} vocabulary; the reserved id and default `render`
 * are fixed here.
 */
export const PALETTE_ID = "apollon:palette"
export const ZOOM_ID = "apollon:zoom"
export const MINIMAP_ID = "apollon:minimap"

/** Placement/appearance a caller may override on a built-in (never its id). */
export type BuiltInPlacement = Partial<Omit<OverlayControlOptions, "id">>

export function paletteControl(
  options: BuiltInPlacement = {}
): OverlayControlInput {
  return {
    id: PALETTE_ID,
    region: "left-rail",
    ...options,
    render: () => <Sidebar />,
  }
}

export interface ZoomControlOptions extends BuiltInPlacement {
  /** Show the undo / redo island (when an undo manager exists). Default `true`. */
  history?: boolean
}

export function zoomControl({
  history,
  ...placement
}: ZoomControlOptions = {}): OverlayControlInput {
  return {
    id: ZOOM_ID,
    region: "bottom-left",
    ...placement,
    render: () => <ZoomControls history={history} />,
  }
}

export interface MiniMapControlOptions extends BuiltInPlacement {
  /** Drag the minimap to pan the diagram. Default `true`. */
  pannable?: boolean
  /** Scroll over the minimap to zoom the diagram. Default `true`. */
  zoomable?: boolean
}

/**
 * Renders the minimap at the registry's LIVE region rather than a value captured
 * when the control was built, so `editor.updateControl(MINIMAP_ID, { region })`
 * actually repositions it (its position isn't baked into the render closure — the
 * behaviour `pannable`/`zoomable` still is, as neither is a layout option).
 */
function BuiltInMiniMap({
  pannable,
  zoomable,
}: Pick<MiniMapControlOptions, "pannable" | "zoomable">) {
  const region = useOverlayStore((s) => s.controls[MINIMAP_ID]?.region)
  return (
    <CustomMiniMap
      position={(region as PanelPosition | undefined) ?? "bottom-right"}
      pannable={pannable}
      zoomable={zoomable}
    />
  )
}

export function miniMapControl({
  pannable,
  zoomable,
  region = "bottom-right",
  ...placement
}: MiniMapControlOptions = {}): OverlayControlInput {
  return {
    id: MINIMAP_ID,
    region,
    selfPositioned: true,
    ...placement,
    render: () => <BuiltInMiniMap pannable={pannable} zoomable={zoomable} />,
  }
}

/** The editor's default chrome — palette, zoom/history cluster, minimap. */
export function defaultControls(): OverlayControlInput[] {
  return [paletteControl(), zoomControl(), miniMapControl()]
}
