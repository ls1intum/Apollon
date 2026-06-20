import {
  Panel,
  ViewportPortal,
  useStore as useReactFlowStore,
  type PanelPosition,
} from "@xyflow/react"
import {
  Fragment,
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
import { computeInsets } from "./overlayStore"
import {
  PANEL_REGIONS,
  type OverlayBreakpoint,
  type OverlayControl,
  type OverlayRegion,
  type OverlaySide,
  type OverlayVisibilityState,
} from "./types"

/** Library-owned bands rendered as absolutely-positioned containers. */
const BAND_REGIONS: OverlayRegion[] = [
  "header",
  "left-rail",
  "right-rail",
  "center-left",
  "center-right",
  "in-front",
]

function breakpointForWidth(width: number): OverlayBreakpoint {
  if (width > 0 && width < 768) return "mobile"
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
  "center-left": "width",
  "center-right": "width",
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
  "center-left": "left",
  "right-rail": "right",
  "center-right": "right",
}

const BAND_STYLE: Record<string, CSSProperties> = {
  header: { top: 0, left: 0, right: 0, flexDirection: "row" },
  "left-rail": { top: 0, bottom: 0, left: 0, flexDirection: "column" },
  "right-rail": { top: 0, bottom: 0, right: 0, flexDirection: "column" },
  "center-left": {
    top: "50%",
    left: 0,
    transform: "translateY(-50%)",
    flexDirection: "column",
  },
  "center-right": {
    top: "50%",
    right: 0,
    transform: "translateY(-50%)",
    flexDirection: "column",
  },
  "in-front": { inset: 0 },
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

  const content: ReactNode = control.toolbarLabel ? (
    <div
      role="toolbar"
      aria-label={control.toolbarLabel}
      aria-orientation={
        control.region === "left-rail" || control.region === "right-rail"
          ? "vertical"
          : "horizontal"
      }
    >
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
 * header/rails/center/in-front, `<ViewportPortal>` for on-canvas), measures
 * auto-inset controls with one shared ResizeObserver, and publishes the derived
 * content-inset rect to the overlay store.
 */
export function OverlayLayer() {
  const controls = useOverlayStore((s) => s.controls)
  const measured = useOverlayStore((s) => s.measured)
  const manualInsets = useOverlayStore((s) => s.manualInsets)
  const setMeasured = useOverlayStore((s) => s.setMeasured)
  const setInsets = useOverlayStore((s) => s.setInsets)
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
  // would provoke "ResizeObserver loop completed").
  const elById = useRef(new Map<string, HTMLElement>())
  const idByEl = useRef(new Map<Element, string>())
  const rafRef = useRef<number | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)

  const flushMeasure = useCallback(() => {
    rafRef.current = null
    for (const [id, el] of elById.current) {
      const control = controls[id]
      if (!control) continue
      const axis = MEASURE_AXIS[control.region]
      const side = REGION_PRIMARY_SIDE[control.region]
      if (!axis || !side) continue
      const size = axis === "width" ? el.offsetWidth : el.offsetHeight
      // Offset the band from the container edge so the reserved room matches the
      // control's outer box (10px standard margin, mirrors the legacy overlays).
      setMeasured(id, { [side]: size + 10 })
    }
  }, [controls, setMeasured])

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

  const registerMeasure = useCallback(
    (id: string, el: HTMLElement | null) => {
      const observer = observerRef.current
      const prev = elById.current.get(id)
      if (prev && prev !== el) {
        observer?.unobserve(prev)
        idByEl.current.delete(prev)
        elById.current.delete(id)
      }
      if (el) {
        elById.current.set(id, el)
        idByEl.current.set(el, id)
        observer?.observe(el)
        scheduleMeasure()
      }
    },
    [scheduleMeasure]
  )

  // Publish the single content-inset rect whenever inputs change.
  useEffect(() => {
    setInsets(computeInsets(visibleControls, measured, manualInsets))
  }, [visibleControls, measured, manualInsets, setInsets])

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
          style={{
            pointerEvents: "none",
            display: "flex",
            gap: 8,
            zIndex: "var(--apollon-z-chrome, 10005)" as unknown as number,
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
            gap: 8,
            pointerEvents: "none",
            zIndex: "var(--apollon-z-chrome, 10005)" as unknown as number,
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
          {onCanvas.map((c) => (
            <Fragment key={c.id}>{c.render()}</Fragment>
          ))}
        </ViewportPortal>
      )}
    </>
  )
}
