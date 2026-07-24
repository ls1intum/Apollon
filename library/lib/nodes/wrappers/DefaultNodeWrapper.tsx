import { AssessmentSelectableWrapper } from "@/components/wrapper/AssessmentSelectableWrapper"
import { FeedbackDropzone } from "@/components/wrapper/FeedbackDropzone"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { useMetadataStore } from "@/store/context"
import {
  getAxisHandlePlan,
  getDistributedHandleOffsetPercents,
  getDistributedHandleOffsets,
  reduceVisibleArcCountForZoom,
} from "@/utils"
import { CANVAS } from "@/constants"
import { Handle, Position, useStore } from "@xyflow/react"
import { type CSSProperties, useMemo } from "react"
import { useShallow } from "zustand/shallow"

// Handle IDs label the 9 connection points distributed across each side. The
// five "named" handles per side (corner / mid-corner / middle / mid-corner /
// corner) live at slot indices 0, 2, 4, 6, 8 of the 9-slot model and
// correspond to the five arcs that render in stage 2 (five-arc layout). The
// four "between" handles per side occupy the odd indices (1, 3, 5, 7) and
// are always hidden connection points — they sit between adjacent arcs in
// stage 2 so existing edges can re-anchor cleanly when a node grows from
// stage 1 (three arcs) into stage 2.
export enum HandleId {
  TopLeft = "top-left",
  TopBetweenLeftMidLeft = "top-between-left-mid-left",
  TopMidLeft = "top-mid-left",
  TopBetweenMidLeftCenter = "top-between-mid-left-center",
  Top = "top",
  TopBetweenCenterMidRight = "top-between-center-mid-right",
  TopMidRight = "top-mid-right",
  TopBetweenMidRightRight = "top-between-mid-right-right",
  TopRight = "top-right",
  RightTop = "right-top",
  RightBetweenTopMidTop = "right-between-top-mid-top",
  RightMidTop = "right-mid-top",
  RightBetweenMidTopCenter = "right-between-mid-top-center",
  Right = "right",
  RightBetweenCenterMidBottom = "right-between-center-mid-bottom",
  RightMidBottom = "right-mid-bottom",
  RightBetweenMidBottomBottom = "right-between-mid-bottom-bottom",
  RightBottom = "right-bottom",
  BottomRight = "bottom-right",
  BottomBetweenRightMidRight = "bottom-between-right-mid-right",
  BottomMidRight = "bottom-mid-right",
  BottomBetweenMidRightCenter = "bottom-between-mid-right-center",
  Bottom = "bottom",
  BottomBetweenCenterMidLeft = "bottom-between-center-mid-left",
  BottomMidLeft = "bottom-mid-left",
  BottomBetweenMidLeftLeft = "bottom-between-mid-left-left",
  BottomLeft = "bottom-left",
  LeftBottom = "left-bottom",
  LeftBetweenBottomMidBottom = "left-between-bottom-mid-bottom",
  LeftMidBottom = "left-mid-bottom",
  LeftBetweenMidBottomCenter = "left-between-mid-bottom-center",
  Left = "left",
  LeftBetweenCenterMidTop = "left-between-center-mid-top",
  LeftMidTop = "left-mid-top",
  LeftBetweenMidTopTop = "left-between-mid-top-top",
  LeftTop = "left-top",
}

// Preset for hiding every handle except the four directional middles. Used
// by nodes whose visible shape only meaningfully connects at the centre of
// each side (BPMN circles, diamonds, the SFC transition branch, etc.).
export const FOUR_WAY_HANDLES_PRESET: HandleId[] = [
  HandleId.TopLeft,
  HandleId.TopBetweenLeftMidLeft,
  HandleId.TopMidLeft,
  HandleId.TopBetweenMidLeftCenter,
  HandleId.TopBetweenCenterMidRight,
  HandleId.TopMidRight,
  HandleId.TopBetweenMidRightRight,
  HandleId.TopRight,
  HandleId.RightTop,
  HandleId.RightBetweenTopMidTop,
  HandleId.RightMidTop,
  HandleId.RightBetweenMidTopCenter,
  HandleId.RightBetweenCenterMidBottom,
  HandleId.RightMidBottom,
  HandleId.RightBetweenMidBottomBottom,
  HandleId.RightBottom,
  HandleId.BottomRight,
  HandleId.BottomBetweenRightMidRight,
  HandleId.BottomMidRight,
  HandleId.BottomBetweenMidRightCenter,
  HandleId.BottomBetweenCenterMidLeft,
  HandleId.BottomMidLeft,
  HandleId.BottomBetweenMidLeftLeft,
  HandleId.BottomLeft,
  HandleId.LeftBottom,
  HandleId.LeftBetweenBottomMidBottom,
  HandleId.LeftMidBottom,
  HandleId.LeftBetweenMidBottomCenter,
  HandleId.LeftBetweenCenterMidTop,
  HandleId.LeftMidTop,
  HandleId.LeftBetweenMidTopTop,
  HandleId.LeftTop,
]

interface Props {
  children: React.ReactNode
  width?: number
  height?: number
  elementId: string
  hiddenHandles?: HandleId[] | true
  /** Move the connection rectangle's top edge into the node while retaining the
   * node's full visual/selection bounds (the raised package tab). */
  connectionTopInset?: number
  // Keep the handles (so existing edges anchored to them still render) but stop
  // this node from being a connection TARGET. Used by non-connectable shapes that
  // can still be an edge SOURCE, e.g. a BPMN annotation.
  isConnectableEnd?: boolean
}

export function DefaultNodeWrapper({
  elementId,
  children,
  hiddenHandles = [],
  isConnectableEnd = true,
  connectionTopInset = 0,
}: Props) {
  // Subscribe to only the fields this wrapper uses, with shallow equality, so a
  // node re-renders its handles on resize/type change but not on the position
  // and selection churn that subscribing to the whole node would pull in — this
  // wrapper sits on every node's render path. An imperative getNode() read here
  // would instead go stale once the React Compiler memoizes the component.
  const { nodeType, nodeWidth, nodeHeight } = useStore(
    useShallow((s) => {
      const n = s.nodeLookup.get(elementId)
      return {
        nodeType: n?.type,
        nodeWidth: n?.width ?? 0,
        nodeHeight: n?.height ?? 0,
      }
    })
  )
  const isDiagramModifiable = useDiagramModifiable()
  // Connection indicators keep a usable minimum on-screen size when zoomed out
  // and grow with the node when zoomed in (matching the edge handles):
  //   scale = 1 / min(zoom, 1)  — constant on-screen for zoom<=1, natural >1.
  const zoom = useStore((state) => state.transform[2])
  const handleScreenScale =
    1 /
    Math.min(
      Math.max(
        Number.isFinite(zoom) && zoom > 0 ? zoom : 1,
        CANVAS.MIN_SCALE_TO_ZOOM_OUT
      ),
      1
    )
  const {
    connectionGuidanceActive,
    connectionGuidanceSourceNodeId,
    connectionGuidanceSourceHandleId,
  } = useMetadataStore(
    useShallow((state) => ({
      connectionGuidanceActive: state.connectionGuidanceActive,
      connectionGuidanceSourceNodeId: state.connectionGuidanceSourceNodeId,
      connectionGuidanceSourceHandleId: state.connectionGuidanceSourceHandleId,
    }))
  )

  const baseHandleStyle = {
    // Keep the React Flow handle BOX a constant flow size. React Flow derives
    // each edge's connection point from this box's measured geometry, and it
    // re-measures on resize — so a zoom-scaled box shifts the edge endpoint by
    // half the box (a visible gap between edge tip and node when resizing while
    // zoomed out). Only the visible arc (::before, via --arc-scale) scales with
    // zoom; the grab target is that arc, not this box.
    width: 8,
    height: 8,
    position: "absolute" as const,
    backgroundColor: "transparent",
    border: "none",
    zIndex: 10,
    transition: "opacity 120ms ease",
    overflow: "visible",
    boxSizing: "border-box" as const,
    // Consumed by the arc ::before pseudo-element (see app.css) to keep the
    // visible indicator a predictable on-screen size across zoom.
    "--arc-scale": handleScreenScale,
  } as CSSProperties

  // Each side carries nine grid-aligned offsets (slots 0..8). The five
  // arc-bearing positions live at even indices; the four "between" hidden
  // connection points sit at odd indices.
  const [xs0, xs1, xs2, xs3, xs4, xs5, xs6, xs7, xs8] = useMemo(
    () => getDistributedHandleOffsetPercents(nodeWidth),
    [nodeWidth]
  )
  const safeConnectionTopInset = Math.min(
    Math.max(connectionTopInset, 0),
    nodeHeight
  )
  const connectionHeight = Math.max(0, nodeHeight - safeConnectionTopInset)
  const [ys0, ys1, ys2, ys3, ys4, ys5, ys6, ys7, ys8] = useMemo(
    () =>
      getDistributedHandleOffsets(connectionHeight).map(
        (offset) => safeConnectionTopInset + offset
      ),
    [connectionHeight, safeConnectionTopInset]
  )

  // The width axis governs arcs on the top/bottom sides; the height axis
  // governs arcs on the left/right sides. The size-based plan picks 5/3/1
  // arcs; we then reduce that for the current zoom so arcs never overlap on
  // screen when zoomed out (their slot positions stay fixed — we just show
  // fewer).
  //   visibleArcCount = 5 → arcs at slots 0, 2, 4, 6, 8 (every even slot).
  //   visibleArcCount = 3 → arcs at slots 0, 4, 8 (corners + middle).
  //   visibleArcCount = 1 → arc at slot 4 only (centre).
  const widthArcs = useMemo(() => {
    const plan = getAxisHandlePlan(nodeWidth)
    return reduceVisibleArcCountForZoom(
      plan.offsets,
      plan.visibleArcCount,
      zoom
    )
  }, [nodeWidth, zoom])
  const heightArcs = useMemo(() => {
    const plan = getAxisHandlePlan(connectionHeight)
    return reduceVisibleArcCountForZoom(
      plan.offsets,
      plan.visibleArcCount,
      zoom
    )
  }, [connectionHeight, zoom])

  const hiddenHandleSet = useMemo(
    () => (hiddenHandles === true ? null : new Set<string>(hiddenHandles)),
    [hiddenHandles]
  )

  const isHandleHiddenByProp = (id: HandleId): boolean =>
    hiddenHandleSet !== null && hiddenHandleSet.has(id)

  // FOUR_WAY-style nodes hide every handle except the four directional
  // middles. If every corner and mid-corner on a side is hidden through
  // `hiddenHandles` the algorithm's per-stage decision is meaningless, so
  // force the middle to keep its arc whatever the side length is.
  const middleArcForced = (cornerA: HandleId, cornerB: HandleId): boolean =>
    isHandleHiddenByProp(cornerA) && isHandleHiddenByProp(cornerB)

  const arcClass = (side: "top" | "right" | "bottom" | "left"): string =>
    `apollon-arc-handle apollon-arc-handle--${side}`

  // Helper: produce a class only when (a) the algorithm says this slot
  // should be an arc and (b) the slot isn't explicitly hidden by the node's
  // `hiddenHandles` prop. Forces the middle to be visible when both corners
  // on its side have been hidden via the prop (FOUR_WAY case).
  const makeArcClass = (
    side: "top" | "right" | "bottom" | "left",
    handleId: HandleId,
    isVisible: boolean,
    forceMiddle = false
  ): string | undefined => {
    if (isHandleHiddenByProp(handleId)) return undefined
    if (isVisible || forceMiddle) return arcClass(side)
    return undefined
  }

  const topMiddleForce = middleArcForced(HandleId.TopLeft, HandleId.TopRight)
  const bottomMiddleForce = middleArcForced(
    HandleId.BottomLeft,
    HandleId.BottomRight
  )
  const leftMiddleForce = middleArcForced(HandleId.LeftTop, HandleId.LeftBottom)
  const rightMiddleForce = middleArcForced(
    HandleId.RightTop,
    HandleId.RightBottom
  )

  // Arc visibility per slot kind, after consulting both the side's plan and
  // the per-side `hiddenHandles` overrides.
  const showMiddleArc = (axisArcs: 1 | 3 | 5): boolean => axisArcs >= 1
  const showCornerArc = (axisArcs: 1 | 3 | 5): boolean => axisArcs >= 3
  const showMidCornerArc = (axisArcs: 1 | 3 | 5): boolean => axisArcs === 5

  // Top side (slots 0..8 of the width axis).
  const handles = [
    {
      id: HandleId.TopLeft,
      position: Position.Top,
      className: makeArcClass(
        "top",
        HandleId.TopLeft,
        showCornerArc(widthArcs)
      ),
      style: { ...baseHandleStyle, left: xs0, top: safeConnectionTopInset },
    },
    {
      id: HandleId.TopBetweenLeftMidLeft,
      position: Position.Top,
      style: { ...baseHandleStyle, left: xs1, top: safeConnectionTopInset },
    },
    {
      id: HandleId.TopMidLeft,
      position: Position.Top,
      className: makeArcClass(
        "top",
        HandleId.TopMidLeft,
        showMidCornerArc(widthArcs)
      ),
      style: { ...baseHandleStyle, left: xs2, top: safeConnectionTopInset },
    },
    {
      id: HandleId.TopBetweenMidLeftCenter,
      position: Position.Top,
      style: { ...baseHandleStyle, left: xs3, top: safeConnectionTopInset },
    },
    {
      id: HandleId.Top,
      position: Position.Top,
      className: makeArcClass(
        "top",
        HandleId.Top,
        showMiddleArc(widthArcs),
        topMiddleForce
      ),
      style: { ...baseHandleStyle, left: xs4, top: safeConnectionTopInset },
    },
    {
      id: HandleId.TopBetweenCenterMidRight,
      position: Position.Top,
      style: { ...baseHandleStyle, left: xs5, top: safeConnectionTopInset },
    },
    {
      id: HandleId.TopMidRight,
      position: Position.Top,
      className: makeArcClass(
        "top",
        HandleId.TopMidRight,
        showMidCornerArc(widthArcs)
      ),
      style: { ...baseHandleStyle, left: xs6, top: safeConnectionTopInset },
    },
    {
      id: HandleId.TopBetweenMidRightRight,
      position: Position.Top,
      style: { ...baseHandleStyle, left: xs7, top: safeConnectionTopInset },
    },
    {
      id: HandleId.TopRight,
      position: Position.Top,
      className: makeArcClass(
        "top",
        HandleId.TopRight,
        showCornerArc(widthArcs)
      ),
      style: { ...baseHandleStyle, left: xs8, top: safeConnectionTopInset },
    },
    // Right side (slots 0..8 of the height axis).
    {
      id: HandleId.RightTop,
      position: Position.Right,
      className: makeArcClass(
        "right",
        HandleId.RightTop,
        showCornerArc(heightArcs)
      ),
      style: { ...baseHandleStyle, top: ys0 },
    },
    {
      id: HandleId.RightBetweenTopMidTop,
      position: Position.Right,
      style: { ...baseHandleStyle, top: ys1 },
    },
    {
      id: HandleId.RightMidTop,
      position: Position.Right,
      className: makeArcClass(
        "right",
        HandleId.RightMidTop,
        showMidCornerArc(heightArcs)
      ),
      style: { ...baseHandleStyle, top: ys2 },
    },
    {
      id: HandleId.RightBetweenMidTopCenter,
      position: Position.Right,
      style: { ...baseHandleStyle, top: ys3 },
    },
    {
      id: HandleId.Right,
      position: Position.Right,
      className: makeArcClass(
        "right",
        HandleId.Right,
        showMiddleArc(heightArcs),
        rightMiddleForce
      ),
      style: { ...baseHandleStyle, top: ys4 },
    },
    {
      id: HandleId.RightBetweenCenterMidBottom,
      position: Position.Right,
      style: { ...baseHandleStyle, top: ys5 },
    },
    {
      id: HandleId.RightMidBottom,
      position: Position.Right,
      className: makeArcClass(
        "right",
        HandleId.RightMidBottom,
        showMidCornerArc(heightArcs)
      ),
      style: { ...baseHandleStyle, top: ys6 },
    },
    {
      id: HandleId.RightBetweenMidBottomBottom,
      position: Position.Right,
      style: { ...baseHandleStyle, top: ys7 },
    },
    {
      id: HandleId.RightBottom,
      position: Position.Right,
      className: makeArcClass(
        "right",
        HandleId.RightBottom,
        showCornerArc(heightArcs)
      ),
      style: { ...baseHandleStyle, top: ys8 },
    },
    // Bottom side (slots 0..8 of the width axis, right-to-left to match the
    // historical enum ordering).
    {
      id: HandleId.BottomRight,
      position: Position.Bottom,
      className: makeArcClass(
        "bottom",
        HandleId.BottomRight,
        showCornerArc(widthArcs)
      ),
      style: { ...baseHandleStyle, left: xs8 },
    },
    {
      id: HandleId.BottomBetweenRightMidRight,
      position: Position.Bottom,
      style: { ...baseHandleStyle, left: xs7 },
    },
    {
      id: HandleId.BottomMidRight,
      position: Position.Bottom,
      className: makeArcClass(
        "bottom",
        HandleId.BottomMidRight,
        showMidCornerArc(widthArcs)
      ),
      style: { ...baseHandleStyle, left: xs6 },
    },
    {
      id: HandleId.BottomBetweenMidRightCenter,
      position: Position.Bottom,
      style: { ...baseHandleStyle, left: xs5 },
    },
    {
      id: HandleId.Bottom,
      position: Position.Bottom,
      className: makeArcClass(
        "bottom",
        HandleId.Bottom,
        showMiddleArc(widthArcs),
        bottomMiddleForce
      ),
      style: { ...baseHandleStyle, left: xs4 },
    },
    {
      id: HandleId.BottomBetweenCenterMidLeft,
      position: Position.Bottom,
      style: { ...baseHandleStyle, left: xs3 },
    },
    {
      id: HandleId.BottomMidLeft,
      position: Position.Bottom,
      className: makeArcClass(
        "bottom",
        HandleId.BottomMidLeft,
        showMidCornerArc(widthArcs)
      ),
      style: { ...baseHandleStyle, left: xs2 },
    },
    {
      id: HandleId.BottomBetweenMidLeftLeft,
      position: Position.Bottom,
      style: { ...baseHandleStyle, left: xs1 },
    },
    {
      id: HandleId.BottomLeft,
      position: Position.Bottom,
      className: makeArcClass(
        "bottom",
        HandleId.BottomLeft,
        showCornerArc(widthArcs)
      ),
      style: { ...baseHandleStyle, left: xs0 },
    },
    // Left side (slots 0..8 of the height axis, bottom-to-top).
    {
      id: HandleId.LeftBottom,
      position: Position.Left,
      className: makeArcClass(
        "left",
        HandleId.LeftBottom,
        showCornerArc(heightArcs)
      ),
      style: { ...baseHandleStyle, top: ys8 },
    },
    {
      id: HandleId.LeftBetweenBottomMidBottom,
      position: Position.Left,
      style: { ...baseHandleStyle, top: ys7 },
    },
    {
      id: HandleId.LeftMidBottom,
      position: Position.Left,
      className: makeArcClass(
        "left",
        HandleId.LeftMidBottom,
        showMidCornerArc(heightArcs)
      ),
      style: { ...baseHandleStyle, top: ys6 },
    },
    {
      id: HandleId.LeftBetweenMidBottomCenter,
      position: Position.Left,
      style: { ...baseHandleStyle, top: ys5 },
    },
    {
      id: HandleId.Left,
      position: Position.Left,
      className: makeArcClass(
        "left",
        HandleId.Left,
        showMiddleArc(heightArcs),
        leftMiddleForce
      ),
      style: { ...baseHandleStyle, top: ys4 },
    },
    {
      id: HandleId.LeftBetweenCenterMidTop,
      position: Position.Left,
      style: { ...baseHandleStyle, top: ys3 },
    },
    {
      id: HandleId.LeftMidTop,
      position: Position.Left,
      className: makeArcClass(
        "left",
        HandleId.LeftMidTop,
        showMidCornerArc(heightArcs)
      ),
      style: { ...baseHandleStyle, top: ys2 },
    },
    {
      id: HandleId.LeftBetweenMidTopTop,
      position: Position.Left,
      style: { ...baseHandleStyle, top: ys1 },
    },
    {
      id: HandleId.LeftTop,
      position: Position.Left,
      className: makeArcClass(
        "left",
        HandleId.LeftTop,
        showCornerArc(heightArcs)
      ),
      style: { ...baseHandleStyle, top: ys0 },
    },
  ]

  // A handle is "primary" (i.e. visible with an arc and a working
  // connection cursor) if the algorithm gave it an arc class above. Hidden
  // connection points (between-slots, plus arc-slots inactive for the
  // current stage) stay in the DOM as opaque addressable anchors so saved
  // edges keep resolving.
  const visibleHandleIds = new Set<HandleId>()
  for (const handle of handles) {
    if (handle.className) visibleHandleIds.add(handle.id)
  }

  return (
    <AssessmentSelectableWrapper elementId={elementId}>
      <FeedbackDropzone
        elementId={elementId}
        asElement="div"
        elementType={nodeType}
      >
        {hiddenHandles !== true && (
          <>
            {handles.map((handle) => {
              if (isHandleHiddenByProp(handle.id)) {
                return null
              }

              const isPrimaryHandle = visibleHandleIds.has(handle.id)
              const isGuidanceSourceHandle =
                connectionGuidanceActive &&
                elementId === connectionGuidanceSourceNodeId &&
                handle.id === connectionGuidanceSourceHandleId

              return (
                <Handle
                  key={handle.id}
                  id={handle.id}
                  className={[
                    handle.className,
                    isGuidanceSourceHandle
                      ? "apollon-connection-guidance-source"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="source"
                  position={handle.position}
                  style={
                    isPrimaryHandle
                      ? handle.style
                      : {
                          ...handle.style,
                          opacity: 0,
                          pointerEvents: "none",
                        }
                  }
                  isConnectable={isDiagramModifiable}
                  isConnectableStart={isPrimaryHandle && isDiagramModifiable}
                  isConnectableEnd={isConnectableEnd}
                />
              )
            })}
          </>
        )}

        {children}
      </FeedbackDropzone>
    </AssessmentSelectableWrapper>
  )
}
