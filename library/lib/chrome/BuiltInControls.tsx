import { useEffect, useRef, type ReactNode } from "react"
import { PANEL_REGIONS, type OverlayControlInput } from "@/overlay/types"
import type { PanelPosition } from "@xyflow/react"
import { useOverlayStore } from "@/store/context"
import { Sidebar } from "@/components/Sidebar"
import { CustomMiniMap } from "@/components/CustomMiniMap"
import { ZoomControls } from "./builtins/ZoomControls"
import type {
  BuiltInControlConfig,
  ControlsOptions,
  MinimapProps,
  ZoomProps,
} from "./config"

/**
 * The single owner of the editor's built-in controls. It registers the palette
 * and zoom cluster through the overlay engine (so they share the one inset-aware
 * layout and are addressable by a host), and renders the minimap directly (it is
 * a React-Flow-native, self-positioning widget). All three are driven by the
 * public `controls` config: `false` hides, a placement object moves / re-styles /
 * re-configures (`props`), and `render` replaces.
 *
 * Reserved ids (never collide with host-chosen `addControl` ids):
 *   apollon:palette · apollon:zoom · apollon:minimap
 *
 * Rendered INSIDE `<ReactFlow>` so registered render thunks and the minimap
 * resolve React Flow + store context.
 */
export const PALETTE_CONTROL_ID = "apollon:palette"
export const ZOOM_CONTROL_ID = "apollon:zoom"
export const MINIMAP_CONTROL_ID = "apollon:minimap"

/** The non-boolean (placement + props + render) shape of a built-in config. */
type PlacementConfig = Exclude<
  BuiltInControlConfig<Record<string, unknown>>,
  boolean
>

/** Normalize a config to its placement object (`true`/`false`/absent → `{}`). */
function asObject(
  config: BuiltInControlConfig<Record<string, unknown>> | undefined
): PlacementConfig {
  return config && config !== true ? config : {}
}

/** Stable string that changes only when a control's registration meaningfully
 *  changes — so the registering effect re-runs on real edits, never on every
 *  render (which would re-register → recompute insets → re-render → loop). The
 *  render function is represented by presence only; see the note in the effect. */
function signature(
  config: BuiltInControlConfig | undefined,
  baseVisible: boolean
): string {
  if (config === false) return "hidden"
  const c = asObject(config)
  return JSON.stringify({
    region: c.region ?? null,
    order: c.order ?? null,
    inset: c.inset ?? null,
    interactive: c.interactive ?? null,
    visible: baseVisible && (c.visible ?? true),
    className: c.className ?? null,
    style: c.style ?? null,
    props: c.props ?? null,
    hasRender: !!c.render,
  })
}

/** Merge a built-in's defaults with its config into a full control input, or
 *  `null` when it should be unregistered (hidden). */
function resolveControl(
  id: string,
  defaults: Pick<OverlayControlInput, "region" | "inset" | "order">,
  config: BuiltInControlConfig | undefined,
  renderDefault: (props: Record<string, unknown>) => ReactNode,
  baseVisible: boolean
): OverlayControlInput | null {
  if (config === false) return null
  const c = asObject(config)
  if (!(baseVisible && (c.visible ?? true))) return null
  return {
    id,
    region: c.region ?? defaults.region,
    inset: c.inset ?? defaults.inset,
    order: c.order ?? defaults.order,
    interactive: c.interactive,
    className: c.className,
    style: c.style,
    render: c.render ?? (() => renderDefault(c.props ?? {})),
  }
}

/** Minimap region → React Flow panel corner (the minimap self-positions, so only
 *  the six panel corners are meaningful; anything else falls back to its home). */
function minimapPosition(
  config: BuiltInControlConfig | undefined
): PanelPosition {
  const region = asObject(config).region
  return region && (PANEL_REGIONS as readonly string[]).includes(region)
    ? (region as PanelPosition)
    : "bottom-right"
}

export interface BuiltInControlsProps {
  controls?: ControlsOptions
  /** The palette shows only while modelling & editable; gates it beneath config. */
  showPalette: boolean
}

export function BuiltInControls({
  controls,
  showPalette,
}: BuiltInControlsProps) {
  const register = useOverlayStore((s) => s.register)
  const unregister = useOverlayStore((s) => s.unregister)

  // Each effect depends on the real config values (so the deps are honest), but
  // bails via a remembered signature when nothing meaningful changed — an inline
  // `controls={{…}}` that is a new object every render still re-registers zero
  // times (which would otherwise recompute insets → re-render → loop).
  const paletteSigRef = useRef<string>(undefined)
  useEffect(() => {
    const sig = signature(controls?.palette, showPalette)
    if (sig === paletteSigRef.current) return
    paletteSigRef.current = sig
    const input = resolveControl(
      PALETTE_CONTROL_ID,
      { region: "left-rail", inset: "auto", order: 0 },
      controls?.palette,
      () => <Sidebar />,
      showPalette
    )
    if (input) register(input)
    else unregister(PALETTE_CONTROL_ID)
  }, [controls, showPalette, register, unregister])

  const zoomSigRef = useRef<string>(undefined)
  useEffect(() => {
    const sig = signature(controls?.zoom, true)
    if (sig === zoomSigRef.current) return
    zoomSigRef.current = sig
    const input = resolveControl(
      ZOOM_CONTROL_ID,
      { region: "bottom-left", inset: "auto", order: 0 },
      controls?.zoom,
      (props) => <ZoomControls {...(props as ZoomProps)} />,
      true
    )
    if (input) register(input)
    else unregister(ZOOM_CONTROL_ID)
  }, [controls, register, unregister])

  // Unregister on unmount (the effects above only replace-in-place while mounted).
  useEffect(
    () => () => {
      unregister(PALETTE_CONTROL_ID)
      unregister(ZOOM_CONTROL_ID)
    },
    [unregister]
  )

  // Minimap: rendered directly (React-Flow-native, self-positioning). `false` /
  // `visible:false` hides it; `render` replaces it; otherwise the default at the
  // configured corner with its `props`.
  const minimap = controls?.minimap
  if (minimap === false) return null
  const mm = asObject(minimap)
  if (mm.visible === false) return null
  if (mm.render) return <>{mm.render()}</>
  return (
    <CustomMiniMap
      position={minimapPosition(minimap)}
      {...(mm.props as MinimapProps | undefined)}
    />
  )
}
