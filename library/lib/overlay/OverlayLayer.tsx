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
  REGION_EDGE,
  type OverlayControl,
  type OverlayRegion,
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

// The four bands are placed in a CSS-grid frame (see `.apollon-overlay-grid` in
// app.css) instead of being absolutely positioned off JS-measured insets. The
// header/footer own the full top/bottom rows and the rails own the side columns
// of the middle row, so a rail can NEVER overlap the header/footer — the collision
// is structurally impossible, independent of measurement timing. `justifySelf`
// pins the rails to their outer edge (the centre column is the canvas hole).
const BAND_STYLE: Record<string, CSSProperties> = {
  header: { gridArea: "header" },
  footer: { gridArea: "footer" },
  "left-rail": { gridArea: "leftrail", justifySelf: "start" },
  "right-rail": { gridArea: "rightrail", justifySelf: "end" },
}

/**
 * A band stacks its LANES across its cross-axis; lane 0 sits against the anchor
 * edge (top for `header`, bottom for `footer`, outer edge for the rails), higher
 * lanes toward the canvas. The `-reverse` variants keep lane 0 edge-flush even
 * though it renders first. Lanes are flush (no inter-lane gap) so the summed
 * inset matches the painted height exactly.
 */
const LANE_STACK_DIRECTION: Record<string, CSSProperties["flexDirection"]> = {
  header: "column",
  footer: "column-reverse",
  "left-rail": "row",
  "right-rail": "row-reverse",
}

/** Within one lane, controls sit along the band's MAIN axis. */
const LANE_MAIN_DIRECTION: Record<string, CSSProperties["flexDirection"]> = {
  header: "row",
  footer: "row",
  "left-rail": "column",
  "right-rail": "column",
}

/** Group a band's controls by lane, ascending — lane 0 first (rendered against
 *  the anchor edge). Controls keep their incoming `order` within each lane. */
function groupByLane(controls: OverlayControl[]): [number, OverlayControl[]][] {
  const byLane = new Map<number, OverlayControl[]>()
  for (const control of controls) {
    const lane = control.lane ?? 0
    const list = byLane.get(lane) ?? []
    list.push(control)
    byLane.set(lane, list)
  }
  return [...byLane.entries()].sort((a, b) => a[0] - b[0])
}

/**
 * Publishes the on-screen keyboard's overlap (mobile soft keyboard, or any bottom
 * obstruction the visual viewport reports) as `--apollon-keyboard-inset` on the
 * document root. A `bottom: 0` footer band sits at the LAYOUT-viewport bottom,
 * which the keyboard covers; adding this inset lifts the footer (and the rails'
 * bottom) to the VISUAL-viewport bottom so an action bar stays reachable while a
 * label editor has focus. No-op (0) on desktop / where `visualViewport` is absent.
 */
// The keyboard var lives on the document root (one on-screen keyboard, shared by
// every editor). Ref-count writers so unmounting ONE editor doesn't wipe the var
// out from under the others until they'd next re-measure on a viewport event.
let keyboardInsetWriters = 0
function useKeyboardInset(): void {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    const update = () => {
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      root.style.setProperty("--apollon-keyboard-inset", `${overlap}px`)
    }
    update()
    keyboardInsetWriters += 1
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
      keyboardInsetWriters -= 1
      if (keyboardInsetWriters === 0) {
        root.style.removeProperty("--apollon-keyboard-inset")
      }
    }
  }, [])
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

  // A full-width band (header OR footer) must fill its row, not shrink-wrap to
  // content — otherwise a short-content bar (e.g. the mobile navbar with a short
  // title, or an action bar with two buttons) collapses to its content width and
  // its right-aligned controls drift inward (colliding with the floating palette).
  // Side rails already size correctly along their axis.
  const fillRow = control.region === "header" || control.region === "footer"

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
  const setRailGap = useOverlayStore((s) => s.setRailGap)
  useKeyboardInset()

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
  const setRailGapRef = useRef(setRailGap)
  // Sync in the layout phase (before the synchronous measure below reads them),
  // not a passive effect, so flushMeasure never sees a stale control set.
  useLayoutEffect(() => {
    controlsRef.current = controls
    setMeasuredRef.current = setMeasured
    setRailGapRef.current = setRailGap
  }, [controls, setMeasured, setRailGap])

  const flushMeasure = useCallback(() => {
    rafRef.current = null
    for (const [id, el] of elByIdRef.current) {
      const control = controlsRef.current[id]
      if (!control) continue
      const axis = MEASURE_AXIS[control.region]
      const side = REGION_EDGE[control.region]
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
      // A rail reserves its width (cross axis) as the inset, but a bottom corner
      // also needs to know whether the rail reaches DOWN to it. Measure the gap
      // from the rail's real bottom to the container's bottom — the physical
      // quantity, robust to an unrelated band inset shifting the rail's position.
      if (control.region === "left-rail" || control.region === "right-rail") {
        const container = el.closest(".apollon-canvas")
        if (container) {
          const gap =
            container.getBoundingClientRect().bottom -
            el.getBoundingClientRect().bottom
          setRailGapRef.current(id, gap)
        }
      }
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

      <div className="apollon-overlay-grid">
        {BAND_REGIONS.filter((r) => byRegion.has(r)).map((region) => {
          const horizontal = region === "header" || region === "footer"
          return (
            <div
              key={region}
              data-apollon-region={region}
              className="apollon-overlay-band"
              style={{
                display: "flex",
                pointerEvents: "none",
                ...BAND_STYLE[region],
                flexDirection: LANE_STACK_DIRECTION[region],
              }}
            >
              {groupByLane(byRegion.get(region)!).map(
                ([lane, laneControls]) => (
                  <div
                    key={lane}
                    data-apollon-lane={lane}
                    className="apollon-overlay-lane"
                    style={{
                      display: "flex",
                      flexDirection: LANE_MAIN_DIRECTION[region],
                      gap: "var(--apollon-chrome-gap)",
                      // Fill the band's main axis so `fillRow` controls stretch edge
                      // to edge; the cross-axis stays content-sized (the reserved
                      // inset).
                      ...(horizontal ? { width: "100%" } : { height: "100%" }),
                    }}
                  >
                    {laneControls.map((c) => (
                      <ControlSlot
                        key={c.id}
                        control={c}
                        registerMeasure={registerMeasure}
                      />
                    ))}
                  </div>
                )
              )}
            </div>
          )
        })}
      </div>

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
