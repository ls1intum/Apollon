import { ViewportPortal } from "@xyflow/react"
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react"
import { useOverlayStore } from "../store/context"
import {
  CORNER_REGIONS,
  REGION_EDGE,
  type OverlayControl,
  type OverlayRegion,
} from "./types"

/** Library-owned bands rendered as areas of the `.apollon-overlay-grid` frame. */
const BAND_REGIONS: OverlayRegion[] = [
  "header",
  "footer",
  "left-rail",
  "right-rail",
]

// Every region — bands and the six corners — is a cell of the one
// `.apollon-overlay-grid` frame (see app.css): the header/footer own the top/bottom
// rows, the rails span the side tracks between those bands, and the corner slots
// float over the side/center tracks without reserving rail height. `justifySelf`/
// `alignSelf` pin each cell's content to its edge of the grid area.
type Placement = Pick<
  CSSProperties,
  "gridArea" | "gridColumn" | "gridRow" | "justifySelf" | "alignSelf"
>
const REGION_PLACEMENT: Partial<Record<OverlayRegion, Placement>> = {
  header: { gridArea: "header" },
  footer: { gridArea: "footer" },
  // Rails span the adjacent corner rows. Corner controls still float over the
  // same side track, so a short rail leaves bottom/top corners flush instead of
  // reserving an empty row that resizes the palette.
  "left-rail": { gridColumn: 1, gridRow: "2 / 5", justifySelf: "start" },
  "right-rail": { gridColumn: 3, gridRow: "2 / 5", justifySelf: "end" },
  "top-left": { gridArea: "topleft", justifySelf: "start", alignSelf: "start" },
  "top-center": {
    gridArea: "topcenter",
    justifySelf: "center",
    alignSelf: "start",
  },
  "top-right": { gridArea: "topright", justifySelf: "end", alignSelf: "start" },
  "bottom-left": {
    gridArea: "botleft",
    justifySelf: "start",
    alignSelf: "end",
  },
  "bottom-center": {
    gridArea: "botcenter",
    justifySelf: "center",
    alignSelf: "end",
  },
  "bottom-right": {
    gridArea: "botright",
    justifySelf: "end",
    alignSelf: "end",
  },
}

const CORNER_ALIGN_ITEMS: Partial<
  Record<OverlayRegion, CSSProperties["alignItems"]>
> = {
  "top-left": "flex-start",
  "top-center": "flex-start",
  "top-right": "flex-start",
  "bottom-left": "flex-end",
  "bottom-center": "flex-end",
  "bottom-right": "flex-end",
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

function useKeyboardInset(gridRef: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    let host: HTMLElement | null = null
    const update = () => {
      const grid = gridRef.current
      host = (grid?.closest(".apollon-canvas") as HTMLElement | null) ?? grid
      if (!host) return
      const keyboardTop = vv.offsetTop + vv.height
      const overlap = Math.max(
        0,
        host.getBoundingClientRect().bottom - keyboardTop
      )
      host.style.setProperty("--apollon-keyboard-inset", `${overlap}px`)
    }
    update()
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    window.addEventListener("resize", update)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      host?.style.removeProperty("--apollon-keyboard-inset")
    }
  }, [gridRef])
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
  // its right-aligned controls drift inward. Side rails already size correctly
  // along their axis.
  const fillRow = control.region === "header" || control.region === "footer"
  const sideRail =
    control.region === "left-rail" || control.region === "right-rail"

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
        ...(sideRail
          ? { minWidth: 0, maxWidth: "100%", overflow: "auto" }
          : null),
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
 * The single in-canvas host layer. Renders every registered overlay control as a
 * cell of the `.apollon-overlay-grid` frame (bands and the six corners) or through
 * `<ViewportPortal>` (on-canvas), and measures the bands with one shared
 * ResizeObserver so the store can derive the content-inset rect.
 */
export function OverlayLayer() {
  const controls = useOverlayStore((s) => s.controls)
  const setMeasured = useOverlayStore((s) => s.setMeasured)
  const gridRef = useRef<HTMLDivElement>(null)
  useKeyboardInset(gridRef)

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
  const elByRegionRef = useRef(new Map<OverlayRegion, HTMLElement>())
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
      const side = REGION_EDGE[control.region]
      if (!side) continue
      // A control reserves its size along the axis PERPENDICULAR to its edge:
      // top/bottom edges reserve height, left/right reserve width.
      const axis = side === "left" || side === "right" ? "width" : "height"
      // offsetWidth/Height excludes the corner cell's CSS margin, so add it back
      // (read live from --apollon-chrome-edge) — else the reserved inset is one
      // margin short and the camera frames content flush against the chrome.
      // Bands are edge-flush and reserve their raw box.
      const raw = axis === "width" ? el.offsetWidth : el.offsetHeight
      const edge = BAND_REGIONS.includes(control.region)
        ? 0
        : parseFloat(
            getComputedStyle(el).getPropertyValue("--apollon-chrome-edge")
          ) || 0
      setMeasuredRef.current(id, { [side]: raw + edge })
    }

    const grid = gridRef.current
    if (grid) {
      const clear = (region: OverlayRegion) => {
        const el = elByRegionRef.current.get(region)
        if (!el) return 0
        const rect = el.getBoundingClientRect()
        if (rect.height === 0) return 0
        const styles = getComputedStyle(el)
        const edge =
          parseFloat(styles.getPropertyValue("--apollon-chrome-edge")) || 0
        const gap =
          parseFloat(styles.getPropertyValue("--apollon-chrome-gap")) || 0
        return Math.ceil(rect.height + edge + gap)
      }
      grid.style.setProperty(
        "--apollon-left-rail-top-clearance",
        `${clear("top-left")}px`
      )
      grid.style.setProperty(
        "--apollon-left-rail-bottom-clearance",
        `${clear("bottom-left")}px`
      )
      grid.style.setProperty(
        "--apollon-right-rail-top-clearance",
        `${clear("top-right")}px`
      )
      grid.style.setProperty(
        "--apollon-right-rail-bottom-clearance",
        `${clear("bottom-right")}px`
      )
    }
  }, [])

  const scheduleMeasure = useCallback(() => {
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(flushMeasure)
  }, [flushMeasure])

  useEffect(() => {
    const observer = new ResizeObserver(() => scheduleMeasure())
    observerRef.current = observer
    for (const el of elByIdRef.current.values()) observer.observe(el)
    for (const el of elByRegionRef.current.values()) observer.observe(el)
    scheduleMeasure()
    return () => {
      observer.disconnect()
      observerRef.current = null
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [scheduleMeasure])

  // Measure synchronously (pre-paint) whenever the set of controls changes, so a
  // newly-registered auto-inset control reserves its room on the SAME frame it
  // first paints — never one frame at inset 0. The ResizeObserver below keeps it
  // in sync on later resizes.
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

  const registerRegion = useCallback(
    (region: OverlayRegion, el: HTMLElement | null) => {
      const observer = observerRef.current
      const prev = elByRegionRef.current.get(region)
      if (prev && prev !== el) {
        observer?.unobserve(prev)
        elByRegionRef.current.delete(region)
      }
      if (el) {
        elByRegionRef.current.set(region, el)
        observer?.observe(el)
      }
      scheduleMeasure()
    },
    [scheduleMeasure]
  )

  // Self-positioning controls (for example selection toolbars that delegate
  // placement to React Flow) render themselves bare — never wrapped in a region
  // slot.
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
      <div ref={gridRef} className="apollon-overlay-grid">
        {BAND_REGIONS.filter((r) => byRegion.has(r)).map((region) => {
          const horizontal = region === "header" || region === "footer"
          return (
            <div
              ref={(el) => registerRegion(region, el)}
              key={region}
              data-apollon-region={region}
              className="apollon-overlay-band"
              style={{
                boxSizing: "border-box",
                display: "flex",
                maxHeight: "100%",
                pointerEvents: "none",
                ...REGION_PLACEMENT[region],
                flexDirection: LANE_STACK_DIRECTION[region],
                ...(region === "left-rail"
                  ? {
                      paddingTop: "var(--apollon-left-rail-top-clearance, 0px)",
                      paddingBottom:
                        "var(--apollon-left-rail-bottom-clearance, 0px)",
                    }
                  : null),
                ...(region === "right-rail"
                  ? {
                      paddingTop:
                        "var(--apollon-right-rail-top-clearance, 0px)",
                      paddingBottom:
                        "var(--apollon-right-rail-bottom-clearance, 0px)",
                    }
                  : null),
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
                      ...(horizontal
                        ? { width: "100%" }
                        : { height: "100%", maxWidth: "100%" }),
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

        {CORNER_REGIONS.filter((r) => byRegion.has(r)).map((region) => (
          <div
            ref={(el) => registerRegion(region, el)}
            key={region}
            data-apollon-region={region}
            className="apollon-overlay-corner"
            style={{
              display: "flex",
              gap: "var(--apollon-chrome-gap)",
              alignItems: CORNER_ALIGN_ITEMS[region],
              pointerEvents: "none",
              ...REGION_PLACEMENT[region],
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
      </div>

      {selfPositioned.map((c) => (
        <Fragment key={c.id}>{c.render()}</Fragment>
      ))}

      {onCanvas.length > 0 && (
        <ViewportPortal>
          {/* Wrapped in ControlSlot so interactive on-canvas chrome blocks
              canvas pan/zoom/wheel (nopan/nodrag/nowheel + bubble-phase stop)
              instead of dragging the diagram under the pointer. */}
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
