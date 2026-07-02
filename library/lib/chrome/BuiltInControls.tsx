import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react"
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

/**
 * Renders a built-in's *live* render thunk from the overlay store, subscribing to
 * only that slot. This is what the registered (stable) `render` resolves to, so a
 * host swapping a control's `render`/`props` re-renders just this node — no
 * re-registration, no inset recompute. Rendered inside `<ReactFlow>`, so it
 * resolves React Flow + store context.
 */
function BuiltInRender({ id }: { id: string }) {
  const render = useOverlayStore((s) => s.renders[id])
  return render ? <>{render()}</> : null
}

// Stable per-id slot thunks: the registered `render` never changes identity, so
// registration is driven purely by placement (see `signature`), while the actual
// content flows through `setRender` → `BuiltInRender`.
const PALETTE_SLOT = () => <BuiltInRender id={PALETTE_CONTROL_ID} />
const ZOOM_SLOT = () => <BuiltInRender id={ZOOM_CONTROL_ID} />

/** Stable string that changes only when a control's *placement* meaningfully
 *  changes — so the registering effect re-runs on real edits, never on every
 *  render (which would re-register → recompute insets → re-render → loop).
 *  `render`/`props` are deliberately absent: they flow through `setRender` and so
 *  never trigger a re-registration. */
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
  })
}

/** The live render for a built-in: the host's `render` if given, else the default
 *  rendered with the config's `props`. Re-derived every render and pushed to the
 *  store via `setRender`, so swapping either takes effect without re-registering. */
function currentRender(
  config: BuiltInControlConfig | undefined,
  renderDefault: (props: Record<string, unknown>) => ReactNode
): () => ReactNode {
  const c = asObject(config)
  return c.render ?? (() => renderDefault(c.props ?? {}))
}

/** Merge a built-in's defaults with its config into a full control input (with the
 *  stable slot thunk as `render`), or `null` when it should be unregistered. */
function resolveControl(
  id: string,
  defaults: Pick<OverlayControlInput, "region" | "inset" | "order">,
  config: BuiltInControlConfig | undefined,
  slot: () => ReactNode,
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
    render: slot,
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
  const setRender = useOverlayStore((s) => s.setRender)

  // Keep each built-in's live render current (layout phase, so it lands before
  // paint on the same commit that swapped it — no stale frame). Keyed on the
  // config, so an unrelated editor re-render (e.g. a diagram edit) never re-pushes
  // it. This is what makes `render`/`props` reactive without a re-registration.
  useLayoutEffect(() => {
    setRender(
      PALETTE_CONTROL_ID,
      currentRender(controls?.palette, () => <Sidebar />)
    )
  }, [controls, setRender])
  useLayoutEffect(() => {
    setRender(
      ZOOM_CONTROL_ID,
      currentRender(controls?.zoom, (props) => (
        <ZoomControls {...(props as ZoomProps)} />
      ))
    )
  }, [controls, setRender])

  // Registration depends on the real config values (so the deps are honest), but
  // bails via a remembered *placement* signature when nothing layout-relevant
  // changed — an inline `controls={{…}}` that is a new object every render still
  // re-registers zero times (which would otherwise recompute insets → re-render →
  // loop). Content changes ride the `setRender` effects above instead.
  const paletteSigRef = useRef<string>(undefined)
  useEffect(() => {
    const sig = signature(controls?.palette, showPalette)
    if (sig === paletteSigRef.current) return
    paletteSigRef.current = sig
    const input = resolveControl(
      PALETTE_CONTROL_ID,
      { region: "left-rail", order: 0 },
      controls?.palette,
      PALETTE_SLOT,
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
      { region: "bottom-left", order: 0 },
      controls?.zoom,
      ZOOM_SLOT,
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
