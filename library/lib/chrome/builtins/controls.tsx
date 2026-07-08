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
 * the same registry records host controls use — registered via `editor.addControl`
 * (vanilla / imperative) or the `<Apollon.Palette|Zoom|MiniMap>` compound
 * components (React). Placement/appearance overrides ride the shared
 * {@link OverlayControlOptions} vocabulary; the reserved id and default `render`
 * are fixed here.
 */
export const PALETTE_ID = "apollon:palette"
export const ZOOM_ID = "apollon:zoom"
export const MINIMAP_ID = "apollon:minimap"

type BuiltInPlacement<Region extends OverlayControlOptions["region"]> = Partial<
  Omit<OverlayControlOptions, "id" | "region">
> & {
  region?: Region
}

type PaletteRegion = "left-rail" | "right-rail"
type MiniMapRegion = Extract<PanelPosition, OverlayControlOptions["region"]>

export type PaletteControlOptions = BuiltInPlacement<PaletteRegion>
export type ZoomControlOptions = BuiltInPlacement<
  OverlayControlOptions["region"]
> & {
  /** Show the undo / redo island (when an undo manager exists). Default `true`. */
  history?: boolean
}
export type MiniMapControlOptions = BuiltInPlacement<MiniMapRegion> & {
  /** Drag the minimap to pan the diagram. Default `true`. */
  pannable?: boolean
  /** Scroll over the minimap to zoom the diagram. Default `true`. */
  zoomable?: boolean
}

const PALETTE_REGIONS = new Set<PaletteRegion>(["left-rail", "right-rail"])
const MINIMAP_REGIONS = new Set<MiniMapRegion>([
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
])

function assertBuiltInRegion(
  name: string,
  region: string,
  supported: ReadonlySet<string>
): void {
  if (!supported.has(region)) {
    throw new Error(
      `[${name}] unsupported region "${region}". Supported regions: ${[
        ...supported,
      ].join(", ")}`
    )
  }
}

const BUILT_IN_CONTROL_KIND = Symbol("apollon-built-in-control")
type BuiltInControlKind = "palette" | "minimap"
type BuiltInControlInput = OverlayControlInput & {
  [BUILT_IN_CONTROL_KIND]?: BuiltInControlKind
}

function markBuiltIn<T extends OverlayControlInput>(
  control: T,
  kind: BuiltInControlKind
): T {
  Object.defineProperty(control, BUILT_IN_CONTROL_KIND, {
    value: kind,
    enumerable: false,
  })
  return control
}

function builtInKind(
  control: OverlayControlInput
): BuiltInControlKind | undefined {
  return (control as BuiltInControlInput)[BUILT_IN_CONTROL_KIND]
}

export function preserveBuiltInControlKind(
  from: OverlayControlInput,
  to: OverlayControlInput
): OverlayControlInput {
  const kind = builtInKind(from)
  return kind ? markBuiltIn(to, kind) : to
}

export function assertBuiltInControlRegion(
  control: OverlayControlInput,
  region: string
): void {
  const kind = builtInKind(control)
  if (kind === "palette") {
    assertBuiltInRegion("paletteControl", region, PALETTE_REGIONS)
  } else if (kind === "minimap") {
    assertBuiltInRegion("miniMapControl", region, MINIMAP_REGIONS)
  }
}

export function paletteControl(
  options: PaletteControlOptions = {}
): OverlayControlInput {
  const region = options.region ?? "left-rail"
  assertBuiltInRegion("paletteControl", region, PALETTE_REGIONS)
  return markBuiltIn(
    {
      ...options,
      id: PALETTE_ID,
      region,
      render: () => <Sidebar />,
    },
    "palette"
  )
}

export function zoomControl({
  history,
  region = "bottom-left",
  ...placement
}: ZoomControlOptions = {}): OverlayControlInput {
  return {
    ...placement,
    id: ZOOM_ID,
    region,
    render: () => <ZoomControls history={history} />,
  }
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
      position={
        region && MINIMAP_REGIONS.has(region as MiniMapRegion)
          ? (region as MiniMapRegion)
          : "bottom-right"
      }
      pannable={pannable}
      zoomable={zoomable}
      managed
    />
  )
}

export function miniMapControl({
  pannable,
  zoomable,
  region = "bottom-right",
  ...placement
}: MiniMapControlOptions = {}): OverlayControlInput {
  assertBuiltInRegion("miniMapControl", region, MINIMAP_REGIONS)
  return markBuiltIn(
    {
      ...placement,
      id: MINIMAP_ID,
      region,
      render: () => <BuiltInMiniMap pannable={pannable} zoomable={zoomable} />,
    },
    "minimap"
  )
}

/** The editor's default chrome — palette, zoom/history cluster, minimap. */
export function defaultControls(): OverlayControlInput[] {
  return [paletteControl(), zoomControl(), miniMapControl()]
}
