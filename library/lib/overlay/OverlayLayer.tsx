import { Panel, ViewportPortal, type PanelPosition } from "@xyflow/react"
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react"
import { useOverlayStore } from "../store/context"
import {
  PANEL_REGIONS,
  type OverlayControl,
  type OverlayRegion,
  type OverlaySide,
} from "./types"

/** Library-owned bands rendered as absolutely-positioned containers. */
const BAND_REGIONS: OverlayRegion[] = [
  "header",
  "footer",
  "left-rail",
  "right-rail",
]

/** Which side a band/panel region measures for its auto inset. */
const MEASURE_AXIS: Partial<Record<OverlayRegion, "width" | "height">> = {
  header: "height",
  footer: "height",
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
  footer: "bottom",
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
  // Symmetric to the header: a full-width band pinned to the bottom edge (e.g. an
  // assessment action bar), plus the device safe-area inset for gesture bars.
  footer: {
    bottom: "var(--safe-area-inset-bottom, 0px)",
    left: 0,
    right: 0,
    flexDirection: "row",
  },
  // Side rails sit between the top chrome and any bottom chrome so they never
  // tuck under a full-width header band. --apollon-inset-top/bottom come from the
  // overlay store (the single inset authority), seeded synchronously at
  // registration so a rail that mounts alongside top chrome (e.g. version history
  // already open on load) starts clear of it with no pre-measurement overlap —
  // and collapses to the safe-area edge (0 default) when there is no such chrome.
  // The safe-area inset is added on top so a notched device clears the notch too.
  "left-rail": {
    top: "calc(var(--safe-area-inset-top, 0px) + var(--apollon-inset-top, 0px))",
    bottom:
      "calc(var(--safe-area-inset-bottom, 0px) + var(--apollon-inset-bottom, 0px))",
    left: "var(--safe-area-inset-left, 0px)",
    flexDirection: "column",
  },
  "right-rail": {
    top: "calc(var(--safe-area-inset-top, 0px) + var(--apollon-inset-top, 0px))",
    bottom:
      "calc(var(--safe-area-inset-bottom, 0px) + var(--apollon-inset-bottom, 0px))",
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
 * pointer-transparent region frame, applies the optional `role="group"` wrapper,
 * and blocks canvas pan/zoom/wheel via nopan/nodrag/nowheel + stopPropagation.
 *
 * The stop is BUBBLE-phase (pointer events only, never keyboard — focus/tab order
 * is preserved): a capture-phase stop would swallow the pointerdown before an
 * interactive child's own handler runs, so e.g. the palette's drag never starts.
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

  // The full-width header band must fill its row, not shrink-wrap to content —
  // otherwise a short-content bar (e.g. the mobile navbar with a short title)
  // collapses to its content width and its right-aligned controls drift inward
  // (colliding with the floating palette). Side rails already size correctly.
  const fillRow = control.region === "header"

  return (
    <div
      ref={setRef}
      data-apollon-control={control.id}
      className={
        interactive
          ? `nopan nodrag nowheel ${control.className ?? ""}`
          : control.className
      }
      style={{
        pointerEvents: interactive ? "auto" : "none",
        ...(fillRow ? { flex: "1 1 auto", minWidth: 0 } : null),
        ...control.style,
      }}
      onPointerDown={interactive ? stop : undefined}
      onMouseDown={interactive ? stop : undefined}
      onTouchStart={interactive ? stop : undefined}
    >
      {content}
    </div>
  )
}

/**
 * The single in-canvas host layer. Renders every registered overlay control into
 * its region (React Flow `<Panel>` for the six corners, library-owned bands for
 * header/rails, `<ViewportPortal>` for on-canvas) and measures auto-inset
 * controls with one shared ResizeObserver (the store derives the content-inset
 * rect from those measurements — it is the single inset authority).
 */
export function OverlayLayer() {
  const controls = useOverlayStore((s) => s.controls)
  const setMeasured = useOverlayStore((s) => s.setMeasured)

  const visibleControls = useMemo(
    () =>
      Object.values(controls)
        .filter((c) => c.visible !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [controls]
  )

  // One shared ResizeObserver measures every auto-inset control; writes are
  // rAF-deferred so the callback never triggers a synchronous re-fit (which
  // would provoke "ResizeObserver loop completed"). The observer and its
  // callbacks are STABLE (created once) — they read the latest controls /
  // setMeasured through refs, so registering a new control never tears the
  // observer down (which would drop existing measurements).
  const elByIdRef = useRef(new Map<string, HTMLElement>())
  const rafRef = useRef<number | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)
  const controlsRef = useRef(controls)
  const setMeasuredRef = useRef(setMeasured)
  // Sync in the layout phase (before the synchronous measure below reads them),
  // not a passive effect, so flushMeasure never sees a stale control set.
  useLayoutEffect(() => {
    controlsRef.current = controls
    setMeasuredRef.current = setMeasured
  }, [controls, setMeasured])

  const flushMeasure = useCallback(() => {
    rafRef.current = null
    for (const [id, el] of elByIdRef.current) {
      const control = controlsRef.current[id]
      if (!control) continue
      const axis = MEASURE_AXIS[control.region]
      const side = REGION_PRIMARY_SIDE[control.region]
      if (!axis || !side) continue
      // offsetWidth/Height excludes the corner Panel's CSS margin, so add it
      // back (read live from --apollon-chrome-edge, the single source of truth)
      // — else the reserved inset is one margin short and neighbouring chrome
      // sits flush. Bands are edge-flush and reserve their raw box.
      const raw = axis === "width" ? el.offsetWidth : el.offsetHeight
      const edge = BAND_REGIONS.includes(control.region)
        ? 0
        : parseFloat(
            getComputedStyle(el).getPropertyValue("--apollon-chrome-edge")
          ) || 0
      setMeasuredRef.current(id, { [side]: raw + edge })
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

  // Measure synchronously (pre-paint) whenever the set of controls changes, so a
  // newly-registered auto-inset control reserves its room on the SAME frame it
  // first paints — never one frame at inset 0. That first-paint correctness is
  // what lets the CSS drop its hardcoded `edge + island-h` fallback: the store is
  // authoritative from frame one, so there is neither a pre-measurement slide nor
  // a phantom gap. The ResizeObserver below keeps it in sync on later resizes.
  useLayoutEffect(() => {
    flushMeasure()
  }, [controls, flushMeasure])

  const registerMeasure = useCallback(
    (id: string, el: HTMLElement | null) => {
      const observer = observerRef.current
      const prev = elByIdRef.current.get(id)
      if (prev && prev !== el) {
        observer?.unobserve(prev)
        elByIdRef.current.delete(id)
      }
      if (el) {
        elByIdRef.current.set(id, el)
        observer?.observe(el)
        scheduleMeasure()
      }
    },
    [scheduleMeasure]
  )

  // Self-positioning controls (the React-Flow-native minimap) render their own
  // `<Panel position>`, so they are rendered bare — never wrapped in a region slot.
  const selfPositioned = useMemo(
    () => visibleControls.filter((c) => c.selfPositioned),
    [visibleControls]
  )

  const byRegion = useMemo(() => {
    const map = new Map<OverlayRegion, OverlayControl[]>()
    for (const c of visibleControls) {
      if (c.selfPositioned) continue
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
          style={{
            pointerEvents: "none",
            display: "flex",
            gap: "var(--apollon-chrome-gap)",
          }}
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
            gap: "var(--apollon-chrome-gap)",
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

      {selfPositioned.map((c) => (
        <Fragment key={c.id}>{c.render()}</Fragment>
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
