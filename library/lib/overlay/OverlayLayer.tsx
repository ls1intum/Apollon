import {
  Panel,
  ViewportPortal,
  useStore as useReactFlowStore,
  type PanelPosition,
} from "@xyflow/react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react"
import { useShallow } from "zustand/shallow"
import {
  useDiagramStore,
  useMetadataStore,
  useOverlayStore,
} from "../store/context"
import {
  PANEL_REGIONS,
  type OverlayBreakpoint,
  type OverlayControl,
  type OverlayRegion,
  type OverlaySide,
  type OverlayVisibilityState,
} from "./types"

/** Library-owned bands rendered as absolutely-positioned containers. */
const BAND_REGIONS: OverlayRegion[] = ["header", "left-rail", "right-rail"]

function breakpointForWidth(width: number): OverlayBreakpoint {
  // Pre-measurement width is 0; treat it as desktop to avoid a transient
  // mobile/tablet flip (and chrome flicker) on first paint.
  if (width <= 0) return "desktop"
  if (width < 768) return "mobile"
  if (width < 1024) return "tablet"
  return "desktop"
}

function isControlVisible(
  control: OverlayControl,
  state: OverlayVisibilityState
): boolean {
  if (control.visible === undefined) return true
  return typeof control.visible === "function"
    ? control.visible(state)
    : control.visible
}

/** Which side a band/panel region measures for its auto inset. */
const MEASURE_AXIS: Partial<Record<OverlayRegion, "width" | "height">> = {
  header: "height",
  "top-left": "height",
  "top-center": "height",
  "top-right": "height",
  "bottom-left": "height",
  "bottom-center": "height",
  "bottom-right": "height",
  "left-rail": "width",
  "right-rail": "width",
}

const REGION_PRIMARY_SIDE: Partial<Record<OverlayRegion, OverlaySide>> = {
  header: "top",
  "top-left": "top",
  "top-center": "top",
  "top-right": "top",
  "bottom-left": "bottom",
  "bottom-center": "bottom",
  "bottom-right": "bottom",
  "left-rail": "left",
  "right-rail": "right",
}

const BAND_STYLE: Record<string, CSSProperties> = {
  // Pinned edges add the device safe-area inset so generic embedders (the iOS
  // Capacitor app, a VS Code webview) don't paint chrome under a notch.
  header: {
    top: "var(--safe-area-inset-top, 0px)",
    left: 0,
    right: 0,
    flexDirection: "row",
  },
  // Side rails sit between the header and any bottom chrome so they never tuck
  // under a full-width header band (insets default to 0px when none is present).
  "left-rail": {
    top: "var(--apollon-inset-top, 0px)",
    bottom: "var(--apollon-inset-bottom, 0px)",
    left: "var(--safe-area-inset-left, 0px)",
    flexDirection: "column",
  },
  "right-rail": {
    top: "var(--apollon-inset-top, 0px)",
    bottom: "var(--apollon-inset-bottom, 0px)",
    right: "var(--safe-area-inset-right, 0px)",
    flexDirection: "column",
  },
}

interface ControlSlotProps {
  control: OverlayControl
  registerMeasure: (id: string, el: HTMLElement | null) => void
}

/**
 * Renders a single control: opts pointer events back in over the
 * pointer-transparent region frame, blocks canvas pan/zoom/wheel (#708 pattern,
 * pointer events only — never keyboard), and applies the toolbar a11y wrapper.
 */
function ControlSlot({ control, registerMeasure }: ControlSlotProps) {
  const interactive = control.interactive !== false
  const setRef = useCallback(
    (el: HTMLDivElement | null) => registerMeasure(control.id, el),
    [control.id, registerMeasure]
  )
  const stop = useCallback((e: { stopPropagation: () => void }) => {
    e.stopPropagation()
  }, [])

  const content: ReactNode = control.groupLabel ? (
    <div role="group" aria-label={control.groupLabel}>
      {control.render()}
    </div>
  ) : (
    control.render()
  )

  return (
    <div
      ref={setRef}
      data-apollon-control={control.id}
      className={
        interactive
          ? `nopan nodrag nowheel ${control.className ?? ""}`
          : control.className
      }
      style={{ pointerEvents: interactive ? "auto" : "none", ...control.style }}
      onPointerDownCapture={interactive ? stop : undefined}
      onMouseDownCapture={interactive ? stop : undefined}
      onTouchStartCapture={interactive ? stop : undefined}
    >
      {content}
    </div>
  )
}

/**
 * The single in-canvas host layer. Renders every registered overlay control into
 * its region (React Flow `<Panel>` for the six corners, library-owned bands for
 * header/rails/center/in-front, `<ViewportPortal>` for on-canvas) and measures
 * auto-inset controls with one shared ResizeObserver (the store derives the
 * content-inset rect from those measurements — it is the single inset authority).
 */
export function OverlayLayer() {
  const controls = useOverlayStore((s) => s.controls)
  const setMeasured = useOverlayStore((s) => s.setMeasured)
  const breakpoint = useOverlayStore((s) => s.breakpoint)
  const setBreakpoint = useOverlayStore((s) => s.setBreakpoint)

  const { mode, view, readonly } = useMetadataStore(
    useShallow((s) => ({ mode: s.mode, view: s.view, readonly: s.readonly }))
  )
  const previewMode = useDiagramStore((s) => s.previewMode)
  const width = useReactFlowStore((s) => s.width)

  // Container-derived breakpoint (embedders size independently of the window).
  useEffect(() => {
    setBreakpoint(breakpointForWidth(width))
  }, [width, setBreakpoint])

  const visibilityState: OverlayVisibilityState = useMemo(
    () => ({ mode, view, readonly, previewMode, breakpoint }),
    [mode, view, readonly, previewMode, breakpoint]
  )

  const visibleControls = useMemo(
    () =>
      Object.values(controls)
        .filter((c) => isControlVisible(c, visibilityState))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [controls, visibilityState]
  )

  // One shared ResizeObserver measures every auto-inset control; writes are
  // rAF-deferred so the callback never triggers a synchronous re-fit (which
  // would provoke "ResizeObserver loop completed"). The observer and its
  // callbacks are STABLE (created once) — they read the latest controls /
  // setMeasured through refs, so registering a new control never tears the
  // observer down (which would drop existing measurements).
  const elById = useRef(new Map<string, HTMLElement>())
  const rafRef = useRef<number | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)
  const controlsRef = useRef(controls)
  const setMeasuredRef = useRef(setMeasured)
  useEffect(() => {
    controlsRef.current = controls
    setMeasuredRef.current = setMeasured
  }, [controls, setMeasured])

  const flushMeasure = useCallback(() => {
    rafRef.current = null
    for (const [id, el] of elById.current) {
      const control = controlsRef.current[id]
      if (!control) continue
      const axis = MEASURE_AXIS[control.region]
      const side = REGION_PRIMARY_SIDE[control.region]
      if (!axis || !side) continue
      // Reserve exactly the control's box. Spacing comes from each consumer's
      // own offset (the palette's `top:10`) and from fitView's own gutter, so
      // adding margin here would double-count and shrink neighbours.
      const size = axis === "width" ? el.offsetWidth : el.offsetHeight
      setMeasuredRef.current(id, { [side]: size })
    }
  }, [])

  const scheduleMeasure = useCallback(() => {
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(flushMeasure)
  }, [flushMeasure])

  useEffect(() => {
    const observer = new ResizeObserver(() => scheduleMeasure())
    observerRef.current = observer
    return () => {
      observer.disconnect()
      observerRef.current = null
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [scheduleMeasure])

  // Re-measure when the set of controls changes (a newly-registered auto-inset
  // control needs its first measurement; a removed one is dropped from elById).
  useEffect(() => {
    scheduleMeasure()
  }, [controls, scheduleMeasure])

  const registerMeasure = useCallback(
    (id: string, el: HTMLElement | null) => {
      const observer = observerRef.current
      const prev = elById.current.get(id)
      if (prev && prev !== el) {
        observer?.unobserve(prev)
        elById.current.delete(id)
      }
      if (el) {
        elById.current.set(id, el)
        observer?.observe(el)
        scheduleMeasure()
      }
    },
    [scheduleMeasure]
  )

  const byRegion = useMemo(() => {
    const map = new Map<OverlayRegion, OverlayControl[]>()
    for (const c of visibleControls) {
      const list = map.get(c.region) ?? []
      list.push(c)
      map.set(c.region, list)
    }
    return map
  }, [visibleControls])

  const onCanvas = byRegion.get("on-canvas") ?? []

  return (
    <>
      {PANEL_REGIONS.filter((r) => byRegion.has(r)).map((region) => (
        <Panel
          key={region}
          position={region as PanelPosition}
          className="apollon-overlay-panel"
          style={{ pointerEvents: "none", display: "flex", gap: 8 }}
        >
          {byRegion.get(region)!.map((c) => (
            <ControlSlot
              key={c.id}
              control={c}
              registerMeasure={registerMeasure}
            />
          ))}
        </Panel>
      ))}

      {BAND_REGIONS.filter((r) => byRegion.has(r)).map((region) => (
        <div
          key={region}
          data-apollon-region={region}
          className="apollon-overlay-band"
          style={{
            position: "absolute",
            display: "flex",
            gap: 8,
            pointerEvents: "none",
            ...BAND_STYLE[region],
          }}
        >
          {byRegion.get(region)!.map((c) => (
            <ControlSlot
              key={c.id}
              control={c}
              registerMeasure={registerMeasure}
            />
          ))}
        </div>
      ))}

      {onCanvas.length > 0 && (
        <ViewportPortal>
          {/* Wrapped in ControlSlot so interactive on-canvas chrome blocks
              canvas pan/zoom/wheel (nopan/nodrag/nowheel + capture stop) instead
              of dragging the diagram under the pointer. */}
          {onCanvas.map((c) => (
            <ControlSlot
              key={c.id}
              control={c}
              registerMeasure={registerMeasure}
            />
          ))}
        </ViewportPortal>
      )}
    </>
  )
}
