import { Handle, useStore, useUpdateNodeInternals } from "@xyflow/react"
import { type CSSProperties, useEffect, useMemo, useRef } from "react"
import { useShallow } from "zustand/shallow"
import { CANVAS } from "@/constants"
import {
  ellipseAnchorPoint,
  formatAnchor,
  keyHandlesForSide,
  parseAnchor,
  quantizeRatio,
  SIDE_TO_POSITION,
  sideOwnsCorners,
  visibleKeyRatios,
  type AnchorKind,
  type Side,
} from "./anchorModel"
import { getNodeHandleConfig } from "./nodeHandleConfig"

const SIDE_WORD: Record<Side, "top" | "right" | "bottom" | "left"> = {
  t: "top",
  r: "right",
  b: "bottom",
  l: "left",
}

interface RenderHandle {
  id: string
  side: Side
  position: ReturnType<typeof getPosition>
  style: CSSProperties
  isPrimary: boolean
  kind: AnchorKind
}

const getPosition = (side: Side) => SIDE_TO_POSITION[side]

interface Props {
  elementId: string
  nodeType: string | undefined
  width: number
  height: number
  isDiagramModifiable: boolean
  zoom: number
  guidanceSourceHandleId: string | null
}

/**
 * Renders a node's connection handles from the shared anchor model:
 *   - VISIBLE key handles (corners + centre, plus quarters on long sides; or
 *     just the four side centres for NSEW shapes), each a real React Flow
 *     <Handle> with an arc indicator.
 *   - HIDDEN addressable-anchor handles for any saved edge that references a
 *     non-key ratio (e.g. a grid point), kept in the DOM with `visibility:
 *     hidden` so React Flow can still measure them and native reconnect works.
 *
 * The DOM handle count is bounded (≤ ~5 visible/side + a few referenced
 * anchors) regardless of node size; finer grid density is delivered by the
 * GridGhostLayer during a drag, not by more DOM handles.
 */
export function ConnectHandles({
  elementId,
  nodeType,
  width,
  height,
  isDiagramModifiable,
  zoom,
  guidanceSourceHandleId,
}: Props) {
  const config = getNodeHandleConfig(nodeType)
  const updateNodeInternals = useUpdateNodeInternals()

  // Anchor ids referenced by edges touching this node — these must always be
  // backed by a (possibly hidden) DOM handle so getEdgePosition resolves them.
  const referencedAnchorIds = useStore(
    useShallow((s) => {
      const ids = new Set<string>()
      for (const edge of s.edges) {
        if (edge.source === elementId && edge.sourceHandle)
          ids.add(edge.sourceHandle)
        if (edge.target === elementId && edge.targetHandle)
          ids.add(edge.targetHandle)
      }
      return [...ids].sort()
    })
  )

  const handles = useMemo<RenderHandle[]>(() => {
    if (config.variant === "none" || width <= 0 || height <= 0) return []

    const isEllipse = config.shape === "ellipse"
    const rect = { x: 0, y: 0, width, height }
    const result: RenderHandle[] = []
    const visibleIds = new Set<string>()

    const positionStyle = (side: Side, ratio: number): CSSProperties => {
      if (isEllipse) {
        const p = ellipseAnchorPoint(rect, side, ratio)
        return {
          left: p.x,
          top: p.y,
          right: "auto",
          bottom: "auto",
          transform: "translate(-50%, -50%)",
        }
      }
      const axis = side === "t" || side === "b" ? width : height
      const px = quantizeRatio(ratio, axis) * axis
      return side === "t" || side === "b" ? { left: px } : { top: px }
    }

    for (const side of config.sides) {
      const axis = side === "t" || side === "b" ? width : height
      // Which key ratios render a visible arc at this zoom (centre always; then
      // corners; then quarters) so arcs never overlap on screen.
      const arcRatios =
        config.variant === "center"
          ? new Set([0.5])
          : new Set(visibleKeyRatios(axis, zoom))

      const dropCorners = config.excludeCorners || !sideOwnsCorners(side)
      const keyHandles =
        config.variant === "center"
          ? [{ ratio: 0.5, kind: "center" as AnchorKind }]
          : keyHandlesForSide(axis).filter(
              (h) => !(dropCorners && h.kind === "corner")
            )

      for (const { ratio, kind } of keyHandles) {
        const id = formatAnchor(side, ratio)
        if (visibleIds.has(id)) continue
        visibleIds.add(id)
        result.push({
          id,
          side,
          position: getPosition(side),
          style: positionStyle(side, ratio),
          isPrimary: arcRatios.has(ratio),
          kind,
        })
      }
    }

    // Addressable anchors for referenced-but-not-visible ratios.
    for (const refId of referencedAnchorIds) {
      if (visibleIds.has(refId)) continue
      const anchor = parseAnchor(refId)
      if (!anchor) continue
      if (!config.sides.includes(anchor.side)) continue
      visibleIds.add(refId)
      result.push({
        id: refId,
        side: anchor.side,
        position: getPosition(anchor.side),
        style: positionStyle(anchor.side, anchor.ratio),
        isPrimary: false,
        kind: "grid",
      })
    }

    return result
  }, [config, width, height, zoom, referencedAnchorIds])

  // Re-measure handles in React Flow whenever the set of handle ids changes
  // AFTER mount (e.g. crossing the quarter threshold, or a new referenced
  // anchor appears). We deliberately skip the initial mount: React Flow already
  // measures handles on first render, and an extra updateNodeInternals there
  // adds a post-mount churn cycle that can race headless SVG export (the
  // serializer settles on a fixed timer) and produce an empty diagram.
  const signature = useMemo(() => handles.map((h) => h.id).join("|"), [handles])
  const lastSignature = useRef<string | null>(null)
  useEffect(() => {
    if (lastSignature.current === null) {
      lastSignature.current = signature
      return
    }
    if (lastSignature.current === signature) return
    lastSignature.current = signature
    updateNodeInternals(elementId)
  }, [signature, elementId, updateNodeInternals])

  const baseStyle: CSSProperties = {
    width: 8,
    height: 8,
    position: "absolute",
    backgroundColor: "transparent",
    border: "none",
    zIndex: 10,
    transition: "opacity 120ms ease",
    overflow: "visible",
    boxSizing: "border-box",
    // Consumed by the arc ::before pseudo-element (app.css) to keep the visible
    // indicator a predictable on-screen size across zoom.
    ["--arc-scale" as string]:
      1 / Math.min(Math.max(zoom, CANVAS.MIN_SCALE_TO_ZOOM_OUT), 1),
  }

  return (
    <>
      {handles.map((handle) => {
        const isGuidanceSource = handle.id === guidanceSourceHandleId
        const arcClass = handle.isPrimary
          ? `apollon-arc-handle apollon-arc-handle--${SIDE_WORD[handle.side]}`
          : ""
        return (
          <Handle
            key={handle.id}
            id={handle.id}
            type="source"
            position={handle.position}
            className={[
              arcClass,
              isGuidanceSource ? "apollon-connection-guidance-source" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              handle.isPrimary
                ? { ...baseStyle, ...handle.style }
                : {
                    ...baseStyle,
                    ...handle.style,
                    visibility: "hidden",
                    opacity: 0,
                    pointerEvents: "none",
                  }
            }
            isConnectable={isDiagramModifiable}
            isConnectableStart={handle.isPrimary && isDiagramModifiable}
          />
        )
      })}
    </>
  )
}
