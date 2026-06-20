import { EDGES, INTERFACE } from "@/constants"
import { snapToAnchor } from "@/nodes/handles/anchorModel"
import { IPoint, pointsToSvgPath } from "@/edges/Connection"
import { DiagramEdgeType, UMLDiagramType } from "@/typings"
import {
  Position,
  Rect,
  XYPosition,
  ConnectionLineType,
  getSmoothStepPath,
} from "@xyflow/react"

/**
 * Adjusts the target coordinates based on the position and marker padding.
 */
export const adjustTargetCoordinates = (
  targetX: number,
  targetY: number,
  targetPosition: Position,
  markerPadding: number
): { targetX: number; targetY: number } => {
  if (targetPosition === "left") {
    targetX -= markerPadding
  } else if (targetPosition === "right") {
    targetX += markerPadding
  } else if (targetPosition === "top") {
    targetY -= markerPadding
  } else if (targetPosition === "bottom") {
    targetY += markerPadding
  }
  return { targetX, targetY }
}

/**
 * Adjusts the source coordinates based on the position and marker padding.
 */
export const adjustSourceCoordinates = (
  sourceX: number,
  sourceY: number,
  sourcePosition: Position,
  sourcePadding: number
): { sourceX: number; sourceY: number } => {
  if (sourcePosition === "left") {
    sourceX += sourcePadding
  } else if (sourcePosition === "right") {
    sourceX -= sourcePadding
  } else if (sourcePosition === "top") {
    sourceY += sourcePadding
  } else if (sourcePosition === "bottom") {
    sourceY -= sourcePadding
  }
  return { sourceX, sourceY }
}

export const calculateDynamicEdgeLabels = (
  x: number,
  y: number,
  direction: string
) => {
  const offset = 10
  const textOffset = 15

  switch (direction) {
    case "top": {
      const topYOffset = -5
      return {
        roleX: x - offset,
        roleY: y + topYOffset,
        roleTextAnchor: "end" as const,
        multiplicityX: x + offset,
        multiplicityY: y + topYOffset,
        multiplicityTextAnchor: "start" as const,
      }
    }
    case "bottom": {
      const bottomYOffset = textOffset
      return {
        roleX: x - offset,
        roleY: y + bottomYOffset,
        roleTextAnchor: "end" as const,
        multiplicityX: x + offset,
        multiplicityY: y + bottomYOffset,
        multiplicityTextAnchor: "start" as const,
      }
    }
    case "left": {
      const leftXOffset = -5
      return {
        roleX: x + leftXOffset,
        roleY: y - offset,
        roleTextAnchor: "end" as const,
        multiplicityX: x + leftXOffset,
        multiplicityY: y + 20,
        multiplicityTextAnchor: "end" as const,
      }
    }
    case "right": {
      return {
        roleX: x + 5,
        roleY: y - offset,
        roleTextAnchor: "start" as const,
        multiplicityX: x + 5,
        multiplicityY: y + 20,
        multiplicityTextAnchor: "start" as const,
      }
    }
    default: {
      return {
        roleX: x,
        roleY: y - offset,
        roleTextAnchor: "middle" as const,
        multiplicityX: x,
        multiplicityY: y + offset,
        multiplicityTextAnchor: "middle" as const,
      }
    }
  }
}

export interface EdgeMarkerStyles {
  markerEnd?: string
  markerStart?: string
  markerPadding?: number
  strokeDashArray?: string
  offset?: number
}

export function getEdgeMarkerStyles(edgeType: string): EdgeMarkerStyles {
  switch (edgeType) {
    case "ClassBidirectional":
    case "DeploymentAssociation":
    case "ObjectLink":
    case "SyntaxTreeLink":
    case "CommunicationLink":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        strokeDashArray: "0",
        offset: 0,
      }
    case "ActivityControlFlow":
    case "ClassUnidirectional":
    case "FlowChartFlowline":
    case "ReachabilityGraphArc":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#black-arrow)",
        strokeDashArray: "0",
        offset: 0,
      }
    case "ClassAggregation":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#white-rhombus)",
        strokeDashArray: "0",
        offset: 0,
      }
    case "ClassComposition":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#black-rhombus)",
        strokeDashArray: "0",
        offset: 0,
      }
    case "ClassInheritance":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#white-triangle)",
        strokeDashArray: "0",
        offset: 0,
      }
    case "PetriNetArc":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#black-triangle)",
        strokeDashArray: "0",
        offset: 0,
      }
    case "ComponentDependency":
    case "ClassDependency":
    case "DeploymentDependency":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#black-arrow)",
        strokeDashArray: "10",
        offset: 0,
      }
    case "ClassRealization":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#white-triangle)",
        strokeDashArray: "10",
        offset: 0,
      }
    case "BPMNSequenceFlow":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#bpmn-black-triangle)",
        strokeDashArray: "0",
        offset: 8,
      }
    case "BPMNMessageFlow":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#bpmn-white-triangle)",
        markerStart: "url(#bpmn-white-circle)",
        strokeDashArray: "10",
        offset: 8,
      }
    case "BPMNAssociationFlow":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        strokeDashArray: "10",
        offset: 0,
      }
    case "BPMNDataAssociationFlow":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#bpmn-arrow)",
        strokeDashArray: "10",
        offset: 8,
      }
    case "UseCaseAssociation":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        strokeDashArray: "0",
        offset: 0,
      }
    case "UseCaseInclude":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#black-arrow)",
        strokeDashArray: "10",
        offset: 0,
      }
    case "UseCaseExtend":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#black-arrow)",
        strokeDashArray: "10",
        offset: 0,
      }
    case "UseCaseGeneralization":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#white-triangle)",
        strokeDashArray: "0",
        offset: 0,
      }

    case "ComponentProvidedInterface":
    case "DeploymentProvidedInterface":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        strokeDashArray: "0", // Plain line like association
        offset: 0,
      }
    case "ComponentRequiredInterface":
    case "DeploymentRequiredInterface":
      return {
        // markerPadding = MARKER_PADDING + gap
        // MARKER_PADDING (-3) compensates for React Flow handle offset
        // gap is the spacing between socket arc and ball circle
        markerPadding: EDGES.MARKER_PADDING + INTERFACE.SOCKET_GAP,
        markerEnd: "url(#required-interface)",
        strokeDashArray: "0",
        offset: 0,
      }
    case "ComponentRequiredQuarterInterface":
    case "DeploymentRequiredQuarterInterface":
      return {
        markerPadding: EDGES.MARKER_PADDING + INTERFACE.SOCKET_GAP,
        markerEnd: "url(#required-interface-quarter)",
        strokeDashArray: "0",
        offset: 0,
      }
    case "ComponentRequiredThreeQuarterInterface":
    case "DeploymentRequiredThreeQuarterInterface":
      return {
        markerPadding: EDGES.MARKER_PADDING + INTERFACE.SOCKET_GAP,
        markerEnd: "url(#required-interface-threequarter)",
        strokeDashArray: "0",
        offset: 0,
      }
    default:
      return {
        markerPadding: EDGES.MARKER_PADDING,
        strokeDashArray: "0",
        offset: 0,
      }
  }
}

export interface FindClosestHandleParams {
  point: XYPosition
  rect: Rect
  /** Restrict to the four side centres (NSEW shapes: circles, diamonds, …). */
  useFourHandles?: boolean
  /** Exclude the corner anchors (e.g. activity fork bars). */
  excludeCorners?: boolean
  /** Current canvas zoom — drives the grid level of detail. Defaults to 1. */
  zoom?: number
}

/**
 * Resolve a drop / reconnect point to a canonical `side:ratio` anchor id via the
 * shared anchor model (see lib/nodes/handles/anchorModel.ts). Always returns a
 * renderable anchor, so React Flow can never drop the edge for a missing handle.
 */
export function findClosestHandle({
  point,
  rect,
  useFourHandles = false,
  excludeCorners = false,
  zoom = 1,
}: FindClosestHandleParams): string {
  return snapToAnchor(rect, point, zoom, {
    variant: useFourHandles ? "center" : "key",
    excludeCorners,
  }).id
}

export type Orientation = "horizontal" | "vertical"

export type AxisAlignedSegment = {
  index: number
  start: IPoint
  end: IPoint
  orientation: Orientation
  fixed: number
  min: number
  max: number
}

export function getAxisAlignedSegments(
  points: IPoint[],
  tolerance: number = 1
): AxisAlignedSegment[] {
  const segments: AxisAlignedSegment[] = []
  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i]
    const end = points[i + 1]
    const isVertical = Math.abs(start.x - end.x) <= tolerance
    const isHorizontal = Math.abs(start.y - end.y) <= tolerance

    if (!isVertical && !isHorizontal) continue

    if (isVertical) {
      const min = Math.min(start.y, end.y)
      const max = Math.max(start.y, end.y)
      segments.push({
        index: i,
        start,
        end,
        orientation: "vertical",
        fixed: start.x,
        min,
        max,
      })
    } else {
      const min = Math.min(start.x, end.x)
      const max = Math.max(start.x, end.x)
      segments.push({
        index: i,
        start,
        end,
        orientation: "horizontal",
        fixed: start.y,
        min,
        max,
      })
    }
  }

  return segments
}

export type LineJumpHit = {
  segmentIndex: number
  point: IPoint
  orientation: Orientation
}

export function findLineJumpIntersections(
  baseSegments: AxisAlignedSegment[],
  otherSegments: AxisAlignedSegment[],
  jumpWidth: number,
  preferredOrientation: Orientation | "any" = "horizontal",
  tolerance: number = 1
): LineJumpHit[] {
  // `margin` keeps a hop off the base segment's own corners — the arc spans
  // ±jumpWidth/2, so a crossing nearer than that to a bend would overrun it.
  const margin = jumpWidth / 2 + 2
  const hits: LineJumpHit[] = []

  for (const base of baseSegments) {
    if (
      preferredOrientation !== "any" &&
      base.orientation !== preferredOrientation
    ) {
      continue
    }

    for (const other of otherSegments) {
      if (base.orientation === other.orientation) continue

      if (
        base.orientation === "horizontal" &&
        other.orientation === "vertical"
      ) {
        const x = other.fixed
        const y = base.fixed
        if (
          x < base.min + margin ||
          x > base.max - margin ||
          // The crossed segment must pass THROUGH the base line, not merely
          // touch it: a crossing at the other segment's endpoint is a
          // T-junction/corner where the lines meet, not cross — bridging it
          // would falsely signal "no connection". Require a strict interior
          // crossing (inset by `tolerance`).
          y < other.min + tolerance ||
          y > other.max - tolerance
        ) {
          continue
        }

        hits.push({
          segmentIndex: base.index,
          point: { x, y },
          orientation: base.orientation,
        })
      }

      if (
        base.orientation === "vertical" &&
        other.orientation === "horizontal"
      ) {
        const x = base.fixed
        const y = other.fixed
        if (
          y < base.min + margin ||
          y > base.max - margin ||
          // Strict interior crossing on the other segment — see above.
          x < other.min + tolerance ||
          x > other.max - tolerance
        ) {
          continue
        }

        hits.push({
          segmentIndex: base.index,
          point: { x, y },
          orientation: base.orientation,
        })
      }
    }
  }

  return hits
}

export function buildPathWithLineJumps(
  points: IPoint[],
  jumps: LineJumpHit[],
  jumpHeight: number,
  jumpWidth: number = EDGES.EDGE_LINE_JUMP_WIDTH
): string {
  if (points.length === 0) return ""
  if (jumps.length === 0) return pointsToSvgPath(points)

  const round = (num: number) => Math.round(num)
  // Match pointsToSvgPath's space-separated "M x y" format so a step edge's `d`
  // keeps the same shape whether or not it carries bridges — consumers and e2e
  // tests parse the source point with a "M x y" regex.
  const fmt = (point: IPoint) => `${round(point.x)} ${round(point.y)}`
  const jumpsBySegment = new Map<number, LineJumpHit[]>()

  for (const jump of jumps) {
    const list = jumpsBySegment.get(jump.segmentIndex) ?? []
    list.push(jump)
    jumpsBySegment.set(jump.segmentIndex, list)
  }

  const pathParts = [`M ${fmt(points[0])}`]

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i]
    const end = points[i + 1]
    const isHorizontal = Math.abs(start.y - end.y) < 1
    const segmentLength = isHorizontal
      ? Math.abs(end.x - start.x)
      : Math.abs(end.y - start.y)

    const segmentJumps = jumpsBySegment.get(i)
    if (!segmentJumps || segmentJumps.length === 0) {
      pathParts.push(`L ${fmt(end)}`)
      continue
    }

    if (segmentLength < jumpWidth * 1.2) {
      pathParts.push(`L ${fmt(end)}`)
      continue
    }

    const coordKey = (jump: LineJumpHit) =>
      isHorizontal ? jump.point.x : jump.point.y
    const direction = isHorizontal
      ? Math.sign(end.x - start.x) || 1
      : Math.sign(end.y - start.y) || 1
    const sortedJumps = [...segmentJumps].sort((a, b) =>
      direction >= 0 ? coordKey(a) - coordKey(b) : coordKey(b) - coordKey(a)
    )
    const margin = jumpWidth / 2 + 2
    let lastCoord = direction >= 0 ? -Infinity : Infinity

    for (const jump of sortedJumps) {
      const coord = coordKey(jump)
      const min = isHorizontal
        ? Math.min(start.x, end.x)
        : Math.min(start.y, end.y)
      const max = isHorizontal
        ? Math.max(start.x, end.x)
        : Math.max(start.y, end.y)

      if (coord < min + margin || coord > max - margin) {
        continue
      }
      if (
        (direction >= 0 && coord - lastCoord < jumpWidth) ||
        (direction < 0 && lastCoord - coord < jumpWidth)
      ) {
        continue
      }

      const halfJump = Math.min(jumpWidth / 2, segmentLength / 2 - 2)
      if (halfJump <= 1) continue

      const startCoord = direction >= 0 ? -halfJump : halfJump
      const endCoord = direction >= 0 ? halfJump : -halfJump
      const jumpStart = isHorizontal
        ? { x: coord + startCoord, y: start.y }
        : { x: start.x, y: coord + startCoord }
      const jumpEnd = isHorizontal
        ? { x: coord + endCoord, y: start.y }
        : { x: start.x, y: coord + endCoord }
      const control = isHorizontal
        ? { x: coord, y: start.y - Math.abs(jumpHeight) }
        : { x: start.x + Math.abs(jumpHeight), y: coord }

      pathParts.push(`L ${fmt(jumpStart)}`, `Q ${fmt(control)} ${fmt(jumpEnd)}`)

      lastCoord = coord
    }

    pathParts.push(`L ${fmt(end)}`)
  }

  return pathParts.join(" ")
}

/**
 * Collects the crossings an edge should bridge over. Uses the layout-stable
 * "horizontal hops vertical" convention (yEd / yFiles' `BridgeManager` default
 * `HORIZONTAL_BRIDGES_VERTICAL`): the bridge is always drawn on the HORIZONTAL
 * segment of a crossing. Consequences that make this the right default for a
 * declarative editor:
 *  - exactly one edge of any H×V pair hops (the horizontal one),
 *  - the assignment is independent of edge array order / z-index, so it never
 *    flips when an edge is selected (React Flow's `elevateEdgesOnSelect`) or
 *    reordered — unlike a render-order rule.
 * Diagonal segments yield no axis-aligned segments, so they neither hop nor are
 * hopped (line jumps are orthogonal-only, matching mxGraph/ELK/yFiles).
 *
 * @param geometryMap each OTHER edge's actual rendered polyline, keyed by id
 *   (from the edge-geometry registry)
 */
export function computeLineJumpsForEdge(
  edgeId: string,
  basePoints: IPoint[],
  edges: ReadonlyArray<{ id: string }>,
  geometryMap: ReadonlyMap<string, IPoint[]>
): LineJumpHit[] {
  const baseSegments = getAxisAlignedSegments(basePoints)
  if (baseSegments.length === 0) return []

  const hits: LineJumpHit[] = []
  for (const other of edges) {
    if (other.id === edgeId) continue
    const otherPoints = geometryMap.get(other.id)
    if (!otherPoints || otherPoints.length < 2) continue
    hits.push(
      ...findLineJumpIntersections(
        baseSegments,
        getAxisAlignedSegments(otherPoints),
        EDGES.EDGE_LINE_JUMP_WIDTH,
        "horizontal"
      )
    )
  }
  return hits
}

export function calculateOverlayPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  type: string
): string {
  // Round coordinates to whole pixels for pixel-perfect rendering
  const sX = Math.round(sourceX)
  const sY = Math.round(sourceY)
  const tX = Math.round(targetX)
  const tY = Math.round(targetY)

  if (
    type == "UseCaseInclude" ||
    type == "UseCaseExtend" ||
    type == "UseCaseGeneralization" ||
    type == "CommunicationLink" ||
    type == "PetriNetArc"
  ) {
    const { offset } = getEdgeMarkerStyles(type)
    const markerOffset = offset ?? 0

    if (markerOffset !== 0) {
      const dx = tX - sX
      const dy = tY - sY
      const length = Math.sqrt(dx * dx + dy * dy)

      if (length > 0) {
        const normalizedDx = dx / length
        const normalizedDy = dy / length
        const adjustedTargetX = Math.round(tX + normalizedDx * markerOffset)
        const adjustedTargetY = Math.round(tY + normalizedDy * markerOffset)

        return `M ${sX},${sY} L ${adjustedTargetX},${adjustedTargetY}`
      }
    }
  }
  return `M ${sX},${sY} L ${tX},${tY}`
}

export function calculateStraightPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  type: string
): string {
  // Round coordinates to whole pixels for pixel-perfect rendering
  const sX = Math.round(sourceX)
  const sY = Math.round(sourceY)
  const tX = Math.round(targetX)
  const tY = Math.round(targetY)

  const dx = tX - sX
  const dy = tY - sY
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) {
    return `M ${sX},${sY} L ${tX},${tY}`
  }

  if (type === "UseCaseInclude" || type == "UseCaseExtend") {
    const midX = Math.round((sX + tX) / 2)
    const midY = Math.round((sY + tY) / 2)

    const normalizedDx = dx / length
    const normalizedDy = dy / length
    const gapSize = 40

    const gapStartX = Math.round(midX - normalizedDx * gapSize)
    const gapStartY = Math.round(midY - normalizedDy * gapSize)
    const gapEndX = Math.round(midX + normalizedDx * gapSize)
    const gapEndY = Math.round(midY + normalizedDy * gapSize)

    return `M ${sX},${sY} L ${gapStartX},${gapStartY} M ${gapEndX},${gapEndY} L ${tX},${tY}`
  }

  // For all other edge types, just create a straight line
  return `M ${sX},${sY} L ${tX},${tY}`
}

export function simplifySvgPath(path: string): string {
  // Round to whole pixels for pixel-perfect rendering
  const round = (num: number) => Math.round(num)

  const withSpaces = path.replace(/([MLQ])(?=[-0-9])/gi, "$1 ")
  const cleaned = withSpaces.replace(/,/g, " ").trim()
  const tokens = cleaned.split(/\s+/)
  const outputTokens: string[] = []
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i].toUpperCase()
    if (token === "M" || token === "L") {
      const x = parseFloat(tokens[i + 1])
      const y = parseFloat(tokens[i + 2])
      if (!isNaN(x) && !isNaN(y)) {
        outputTokens.push(token, round(x).toString(), round(y).toString())
      }
      i += 3
    } else if (token === "Q") {
      const cx = parseFloat(tokens[i + 1])
      const cy = parseFloat(tokens[i + 2])
      const ex = parseFloat(tokens[i + 3])
      const ey = parseFloat(tokens[i + 4])
      if (cx === ex && cy === ey) {
        outputTokens.push("L", round(ex).toString(), round(ey).toString())
      } else {
        outputTokens.push(
          "Q",
          round(cx).toString(),
          round(cy).toString(),
          round(ex).toString(),
          round(ey).toString()
        )
      }
      i += 5
    } else {
      const x = parseFloat(tokens[i])
      const y = parseFloat(tokens[i + 1])
      if (!isNaN(x) && !isNaN(y)) {
        outputTokens.push(round(x).toString(), round(y).toString())
      }
      i += 2
    }
  }

  return outputTokens.join(" ")
}

export function simplifyPoints(points: IPoint[]): IPoint[] {
  if (points.length < 3) return points
  const result: IPoint[] = [points[0]]

  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1]
    const curr = points[i]
    const next = points[i + 1]
    if (prev.x === curr.x && curr.x === next.x) {
      continue
    }
    if (prev.y === curr.y && curr.y === next.y) {
      continue
    }
    result.push(curr)
  }
  result.push(points[points.length - 1])
  return result
}

export function parseSvgPath(path: string): IPoint[] {
  const tokens = simplifySvgPath(path).replace(/,/g, " ").trim().split(/\s+/)
  const points: IPoint[] = []
  let i = 0
  while (i < tokens.length) {
    const token = tokens[i]
    if (token === "M" || token === "L") {
      const x = parseFloat(tokens[i + 1])
      const y = parseFloat(tokens[i + 2])
      if (!isNaN(x) && !isNaN(y)) {
        points.push({ x, y })
      }
      i += 3
    } else {
      const x = parseFloat(tokens[i])
      const y = parseFloat(tokens[i + 1])
      if (!isNaN(x) && !isNaN(y)) {
        points.push({ x, y })
      }
      i += 2
    }
  }
  return simplifyPoints(points)
}

export function removeDuplicatePoints(points: IPoint[]): IPoint[] {
  if (points.length === 0) return points
  const filtered: IPoint[] = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const prev = filtered[filtered.length - 1]
    const current = points[i]
    if (current.x !== prev.x || current.y !== prev.y) {
      filtered.push(current)
    }
  }
  return filtered
}

export function resolveReconnectPreviewBasePoints(
  storedPoints: IPoint[] | undefined,
  localPoints: IPoint[] | undefined,
  fallbackPoints: IPoint[]
): IPoint[] {
  const previewBasePoints =
    storedPoints && storedPoints.length > 0
      ? storedPoints
      : localPoints && localPoints.length > 0
        ? localPoints
        : fallbackPoints

  return previewBasePoints.map((point) => ({ ...point }))
}

type SegmentAxis = "horizontal" | "vertical"

const getSegmentAxisForPosition = (position: Position): SegmentAxis => {
  switch (position) {
    case Position.Left:
    case Position.Right:
      return "horizontal"
    case Position.Top:
    case Position.Bottom:
      return "vertical"
    default:
      return "vertical"
  }
}

const getAlternatingAxis = (
  firstAxis: SegmentAxis,
  segmentIndex: number
): SegmentAxis =>
  segmentIndex % 2 === 0
    ? firstAxis
    : firstAxis === "horizontal"
      ? "vertical"
      : "horizontal"

const canConnectWithSingleSegment = (
  sourcePoint: IPoint,
  targetPoint: IPoint,
  axis: SegmentAxis
): boolean =>
  axis === "horizontal"
    ? sourcePoint.y === targetPoint.y
    : sourcePoint.x === targetPoint.x

function getMinimumOrthogonalSegmentCount(
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourceAxis: SegmentAxis,
  targetAxis: SegmentAxis
): number {
  if (sourceAxis !== targetAxis) return 2
  return canConnectWithSingleSegment(sourcePoint, targetPoint, sourceAxis)
    ? 1
    : 3
}

const getLaneValue = (
  points: IPoint[],
  index: number,
  axis: SegmentAxis,
  fallbackPoint: IPoint
): number => {
  const point = points[Math.min(index, points.length - 1)] ?? fallbackPoint
  return axis === "horizontal" ? point.x : point.y
}

const buildOrthogonalPathFromLanes = (
  laneValues: number[],
  segmentCount: number,
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourceAxis: SegmentAxis,
  targetAxis: SegmentAxis
): IPoint[] => {
  const result: IPoint[] = [{ ...sourcePoint }]

  for (let i = 1; i < segmentCount; i++) {
    const previousPoint = result[result.length - 1]
    const axis = getAlternatingAxis(sourceAxis, i - 1)

    result.push(
      axis === "horizontal"
        ? { x: laneValues[i], y: previousPoint.y }
        : { x: previousPoint.x, y: laneValues[i] }
    )
  }

  // For segmentCount === 1 the "penultimate" point is the source itself.
  // We still align it to the target axis before appending targetPoint; any
  // degenerate duplicate is collapsed by removeDuplicatePoints below.
  const penultimatePoint = result[result.length - 1]
  if (penultimatePoint) {
    if (targetAxis === "horizontal") {
      penultimatePoint.y = targetPoint.y
    } else {
      penultimatePoint.x = targetPoint.x
    }
  }

  result.push({ ...targetPoint })
  return removeDuplicatePoints(result)
}

const isSourceLaneCompatible = (
  position: Position,
  sourcePoint: IPoint,
  laneValue: number
): boolean => {
  switch (position) {
    case Position.Left:
      // Strict inequality avoids zero-length first segments that would
      // collapse user geometry when a lane equals the endpoint coordinate.
      return laneValue < sourcePoint.x
    case Position.Right:
      return laneValue > sourcePoint.x
    case Position.Top:
      return laneValue < sourcePoint.y
    case Position.Bottom:
      return laneValue > sourcePoint.y
    default:
      return false
  }
}

const isTargetApproachCompatible = (
  position: Position,
  penultimatePoint: IPoint,
  targetPoint: IPoint
): boolean => {
  switch (position) {
    case Position.Left:
      // Strict inequality keeps a real approach segment into the target side.
      return penultimatePoint.x < targetPoint.x
    case Position.Right:
      return penultimatePoint.x > targetPoint.x
    case Position.Top:
      return penultimatePoint.y < targetPoint.y
    case Position.Bottom:
      return penultimatePoint.y > targetPoint.y
    default:
      return false
  }
}

const getStubExitCoord = (
  position: Position,
  point: IPoint,
  stubLength: number
): number => {
  switch (position) {
    case Position.Right:
      return point.x + stubLength
    case Position.Left:
      return point.x - stubLength
    case Position.Bottom:
      return point.y + stubLength
    case Position.Top:
    default:
      return point.y - stubLength
  }
}

const getStubExitPoint = (
  position: Position,
  point: IPoint,
  stubLength: number
): IPoint => {
  switch (position) {
    case Position.Right:
      return { x: point.x + stubLength, y: point.y }
    case Position.Left:
      return { x: point.x - stubLength, y: point.y }
    case Position.Bottom:
      return { x: point.x, y: point.y + stubLength }
    case Position.Top:
    default:
      return { x: point.x, y: point.y - stubLength }
  }
}

const getSafeOrthogonalPathPoints = (
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position
): IPoint[] => {
  const [safePath] = getSmoothStepPath({
    sourceX: sourcePoint.x,
    sourceY: sourcePoint.y,
    sourcePosition,
    targetX: targetPoint.x,
    targetY: targetPoint.y,
    targetPosition,
    borderRadius: EDGES.STEP_BORDER_RADIUS,
    offset: 30,
  })

  return removeDuplicatePoints(parseSvgPath(simplifySvgPath(safePath)))
}

const getStubCollisionFallbackPoints = (
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position
): IPoint[] => {
  const sharedLaneSnapTolerance = Math.abs(
    EDGES.SOURCE_CONNECTION_POINT_PADDING - EDGES.MARKER_PADDING
  )
  const sourceStub = getStubExitPoint(
    sourcePosition,
    sourcePoint,
    EDGES.STUB_LENGTH
  )
  const targetStub = getStubExitPoint(
    targetPosition,
    targetPoint,
    EDGES.STUB_LENGTH
  )
  const sourceAxis = getSegmentAxisForPosition(sourcePosition)

  if (sourceAxis === "horizontal") {
    const stubLaneDelta = Math.abs(sourceStub.x - targetStub.x)
    if (
      sourcePoint.y !== targetPoint.y &&
      stubLaneDelta > 0 &&
      stubLaneDelta <= sharedLaneSnapTolerance
    ) {
      const sharedX = Math.round((sourceStub.x + targetStub.x) / 2)
      return removeDuplicatePoints([
        sourcePoint,
        { x: sharedX, y: sourcePoint.y },
        { x: sharedX, y: targetPoint.y },
        targetPoint,
      ])
    }

    const bridgeY =
      sourcePoint.y !== targetPoint.y
        ? Math.round((sourcePoint.y + targetPoint.y) / 2)
        : sourcePoint.y <= targetPoint.y
          ? Math.min(sourcePoint.y, targetPoint.y) - EDGES.STUB_LENGTH
          : Math.max(sourcePoint.y, targetPoint.y) + EDGES.STUB_LENGTH
    return removeDuplicatePoints([
      sourcePoint,
      sourceStub,
      { x: sourceStub.x, y: bridgeY },
      { x: targetStub.x, y: bridgeY },
      targetStub,
      targetPoint,
    ])
  }

  const stubLaneDelta = Math.abs(sourceStub.y - targetStub.y)
  if (
    sourcePoint.x !== targetPoint.x &&
    stubLaneDelta > 0 &&
    stubLaneDelta <= sharedLaneSnapTolerance
  ) {
    const sharedY = Math.round((sourceStub.y + targetStub.y) / 2)
    return removeDuplicatePoints([
      sourcePoint,
      { x: sourcePoint.x, y: sharedY },
      { x: targetPoint.x, y: sharedY },
      targetPoint,
    ])
  }

  const bridgeX =
    sourcePoint.x !== targetPoint.x
      ? Math.round((sourcePoint.x + targetPoint.x) / 2)
      : sourcePoint.x <= targetPoint.x
        ? Math.min(sourcePoint.x, targetPoint.x) - EDGES.STUB_LENGTH
        : Math.max(sourcePoint.x, targetPoint.x) + EDGES.STUB_LENGTH
  return removeDuplicatePoints([
    sourcePoint,
    sourceStub,
    { x: bridgeX, y: sourceStub.y },
    { x: bridgeX, y: targetStub.y },
    targetStub,
    targetPoint,
  ])
}

const hasCollapsingSegments = (result: IPoint[]): boolean => {
  for (let i = 1; i < result.length - 2; i++) {
    const prev = result[i - 1]
    const curr = result[i]
    const next = result[i + 1]
    const horizBack =
      prev.y === curr.y &&
      curr.y === next.y &&
      (curr.x - prev.x) * (next.x - curr.x) < 0
    const vertBack =
      prev.x === curr.x &&
      curr.x === next.x &&
      (curr.y - prev.y) * (next.y - curr.y) < 0
    if (horizBack || vertBack) return true
  }
  return false
}

/**
 * Returns true when source and target stubs point toward each other and would
 * overlap or leave no room between them. This catches the "narrow U" case —
 * where the two arms of a U-shape almost touch — before the geometry has
 * actually inverted (which hasCollapsingSegments catches too late).
 *
 * Only applies to facing-stub configurations where both stubs exit into the
 * same space and can collide. Diverging pairs are handled by later validation.
 */
export const stubsWouldOverlap = (
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position,
  stubLength: number
): boolean => {
  if (sourcePosition === Position.Right && targetPosition === Position.Left) {
    return (
      sourcePoint.x < targetPoint.x &&
      sourcePoint.x + stubLength >= targetPoint.x - stubLength
    )
  }
  if (sourcePosition === Position.Left && targetPosition === Position.Right) {
    return (
      sourcePoint.x > targetPoint.x &&
      sourcePoint.x - stubLength <= targetPoint.x + stubLength
    )
  }
  if (sourcePosition === Position.Bottom && targetPosition === Position.Top) {
    return (
      sourcePoint.y < targetPoint.y &&
      sourcePoint.y + stubLength >= targetPoint.y - stubLength
    )
  }
  if (sourcePosition === Position.Top && targetPosition === Position.Bottom) {
    return (
      sourcePoint.y > targetPoint.y &&
      sourcePoint.y - stubLength <= targetPoint.y + stubLength
    )
  }
  return false
}

const hasDiagonalSegment = (points: IPoint[]): boolean =>
  points.some((point, index) => {
    if (index === 0) return false
    const previous = points[index - 1]
    return previous.x !== point.x && previous.y !== point.y
  })

const getSourceStubLength = (
  points: IPoint[],
  sourcePoint: IPoint,
  sourcePosition: Position
): number => {
  const first = points[1]
  if (!first) return 0

  switch (sourcePosition) {
    case Position.Right:
      return first.y === sourcePoint.y ? first.x - sourcePoint.x : -Infinity
    case Position.Left:
      return first.y === sourcePoint.y ? sourcePoint.x - first.x : -Infinity
    case Position.Bottom:
      return first.x === sourcePoint.x ? first.y - sourcePoint.y : -Infinity
    case Position.Top:
    default:
      return first.x === sourcePoint.x ? sourcePoint.y - first.y : -Infinity
  }
}

const getTargetStubLength = (
  points: IPoint[],
  targetPoint: IPoint,
  targetPosition: Position
): number => {
  const penultimate = points[points.length - 2]
  if (!penultimate) return 0

  switch (targetPosition) {
    case Position.Left:
      return penultimate.y === targetPoint.y
        ? targetPoint.x - penultimate.x
        : -Infinity
    case Position.Right:
      return penultimate.y === targetPoint.y
        ? penultimate.x - targetPoint.x
        : -Infinity
    case Position.Top:
      return penultimate.x === targetPoint.x
        ? targetPoint.y - penultimate.y
        : -Infinity
    case Position.Bottom:
    default:
      return penultimate.x === targetPoint.x
        ? penultimate.y - targetPoint.y
        : -Infinity
  }
}

const hasReducedTerminalStub = (
  points: IPoint[],
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position
): boolean =>
  getSourceStubLength(points, sourcePoint, sourcePosition) <
    EDGES.STUB_LENGTH ||
  getTargetStubLength(points, targetPoint, targetPosition) < EDGES.STUB_LENGTH

const hasArmCollapse = (points: IPoint[], proximityPx: number): boolean => {
  if (points.length < 4) return false

  for (let i = 0; i < points.length - 1; i++) {
    const aStart = points[i]
    const aEnd = points[i + 1]
    const aIsH = aStart.y === aEnd.y
    const aIsV = aStart.x === aEnd.x
    if (!aIsH && !aIsV) continue

    for (let j = i + 2; j < points.length - 1; j++) {
      const bStart = points[j]
      const bEnd = points[j + 1]
      const bIsH = bStart.y === bEnd.y
      const bIsV = bStart.x === bEnd.x

      if (aIsH && bIsH && Math.abs(aStart.y - bStart.y) <= proximityPx) {
        const aMinX = Math.min(aStart.x, aEnd.x)
        const aMaxX = Math.max(aStart.x, aEnd.x)
        const bMinX = Math.min(bStart.x, bEnd.x)
        const bMaxX = Math.max(bStart.x, bEnd.x)
        if (Math.max(aMinX, bMinX) < Math.min(aMaxX, bMaxX)) return true
      }

      if (aIsV && bIsV && Math.abs(aStart.x - bStart.x) <= proximityPx) {
        const aMinY = Math.min(aStart.y, aEnd.y)
        const aMaxY = Math.max(aStart.y, aEnd.y)
        const bMinY = Math.min(bStart.y, bEnd.y)
        const bMaxY = Math.max(bStart.y, bEnd.y)
        if (Math.max(aMinY, bMinY) < Math.min(aMaxY, bMaxY)) return true
      }
    }
  }

  return false
}

const collapseTinyOrthogonalDoglegs = (
  points: IPoint[],
  proximityPx: number
): IPoint[] => {
  if (points.length < 5) return points

  let collapsed = points.map((point) => ({ ...point }))
  let changed = true

  while (changed) {
    changed = false

    for (let i = 1; i <= collapsed.length - 4; i++) {
      const a = collapsed[i]
      const b = collapsed[i + 1]
      const c = collapsed[i + 2]
      const d = collapsed[i + 3]

      const firstVertical = a.x === b.x
      const firstHorizontal = a.y === b.y
      const secondVertical = c.x === d.x
      const secondHorizontal = c.y === d.y

      if (firstVertical && secondVertical && b.y === c.y) {
        const connectorLength = Math.abs(c.x - b.x)
        const sameDirection = (b.y - a.y) * (d.y - c.y) > 0
        if (
          connectorLength > 0 &&
          connectorLength <= proximityPx &&
          sameDirection
        ) {
          const lane = i + 3 === collapsed.length - 2 ? c.x : a.x
          collapsed[i] = { ...a, x: lane }
          collapsed[i + 1] = { ...b, x: lane }
          collapsed[i + 2] = { ...c, x: lane }
          collapsed[i + 3] = { ...d, x: lane }
          collapsed = removeDuplicatePoints(simplifyPoints(collapsed))
          changed = true
          break
        }
      }

      if (firstHorizontal && secondHorizontal && b.x === c.x) {
        const connectorLength = Math.abs(c.y - b.y)
        const sameDirection = (b.x - a.x) * (d.x - c.x) > 0
        if (
          connectorLength > 0 &&
          connectorLength <= proximityPx &&
          sameDirection
        ) {
          const lane = i + 3 === collapsed.length - 2 ? c.y : a.y
          collapsed[i] = { ...a, y: lane }
          collapsed[i + 1] = { ...b, y: lane }
          collapsed[i + 2] = { ...c, y: lane }
          collapsed[i + 3] = { ...d, y: lane }
          collapsed = removeDuplicatePoints(simplifyPoints(collapsed))
          changed = true
          break
        }
      }
    }
  }

  return collapsed
}

const sanitizeReleasedPoints = (
  points: IPoint[],
  sourcePoint: IPoint,
  targetPoint: IPoint
): IPoint[] => {
  if (points.length < 2) return []

  const rounded = points.map((point) => ({
    x: Math.round(point.x),
    y: Math.round(point.y),
  }))
  rounded[0] = { ...sourcePoint }
  rounded[rounded.length - 1] = { ...targetPoint }

  return removeDuplicatePoints(simplifyPoints(removeDuplicatePoints(rounded)))
}

export function isInvalidOrthogonalEdgeRelease(
  points: IPoint[],
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position
): boolean {
  const sanitized = sanitizeReleasedPoints(points, sourcePoint, targetPoint)

  return (
    sanitized.length < 2 ||
    hasDiagonalSegment(sanitized) ||
    hasReducedTerminalStub(
      sanitized,
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition
    ) ||
    hasArmCollapse(sanitized, EDGES.ORTHOGONAL_ARM_OVERLAP_PX) ||
    stubsWouldOverlap(
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition,
      EDGES.STUB_LENGTH
    )
  )
}

export function normalizeOrthogonalEdgePoints(
  points: IPoint[],
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position
): IPoint[] {
  const hasStubCollision = stubsWouldOverlap(
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition,
    EDGES.STUB_LENGTH
  )
  const fallback = hasStubCollision
    ? getStubCollisionFallbackPoints(
        sourcePoint,
        targetPoint,
        sourcePosition,
        targetPosition
      )
    : getSafeOrthogonalPathPoints(
        sourcePoint,
        targetPoint,
        sourcePosition,
        targetPosition
      )

  const sanitized = sanitizeReleasedPoints(points, sourcePoint, targetPoint)
  if (
    sanitized.length < 2 ||
    hasDiagonalSegment(sanitized) ||
    hasReducedTerminalStub(
      sanitized,
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition
    ) ||
    hasArmCollapse(sanitized, EDGES.ORTHOGONAL_ARM_OVERLAP_PX) ||
    hasStubCollision
  ) {
    return fallback
  }

  const normalized = preserveOrthogonalEdgePoints(
    sanitized,
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition
  )

  const canonical = sanitizeReleasedPoints(normalized, sourcePoint, targetPoint)

  return canonical.length >= 2 && !hasDiagonalSegment(canonical)
    ? canonical
    : fallback
}

export function resolveOrthogonalEdgeReleasePoints(
  releasedPoints: IPoint[],
  lastValidPoints: IPoint[],
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position
): IPoint[] {
  const invalid = isInvalidOrthogonalEdgeRelease(
    releasedPoints,
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition
  )

  // When a release is invalid *because the user dragged the two parallel arms
  // of a U together (or past each other)*, that is a deliberate "merge the U"
  // gesture, not a bad drag — collapse the released geometry rather than
  // snapping back to the pre-drag wide route. normalizeOrthogonalEdgePoints
  // already routes overlapping input to the clean safe path and re-validates
  // stubs, so any other invalidity still falls back safely.
  const sanitized = sanitizeReleasedPoints(
    releasedPoints,
    sourcePoint,
    targetPoint
  )
  const armOverlap = hasArmCollapse(sanitized, EDGES.ORTHOGONAL_ARM_OVERLAP_PX)
  const pointsToNormalize =
    invalid && !armOverlap ? lastValidPoints : releasedPoints

  return normalizeOrthogonalEdgePoints(
    pointsToNormalize,
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition
  )
}
export function preserveOrthogonalEdgePoints(
  points: IPoint[],
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position
): IPoint[] {
  const sourceAxis = getSegmentAxisForPosition(sourcePosition)
  const targetAxis = getSegmentAxisForPosition(targetPosition)
  const safePoints = getSafeOrthogonalPathPoints(
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition
  )

  if (
    stubsWouldOverlap(
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition,
      EDGES.STUB_LENGTH
    )
  ) {
    return getStubCollisionFallbackPoints(
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition
    )
  }

  const originalSegmentCount = Math.max(points.length - 1, 1)
  const safeSegmentCount = Math.max(safePoints.length - 1, 1)
  const minimumSegmentCount = getMinimumOrthogonalSegmentCount(
    sourcePoint,
    targetPoint,
    sourceAxis,
    targetAxis
  )

  if (originalSegmentCount < minimumSegmentCount) {
    return safePoints
  }

  let segmentCount = Math.max(
    originalSegmentCount,
    safeSegmentCount,
    minimumSegmentCount
  )
  while (getAlternatingAxis(sourceAxis, segmentCount - 1) !== targetAxis) {
    segmentCount += 1
  }

  const laneValues: number[] = [Number.NaN]
  for (let i = 1; i < segmentCount; i++) {
    const axis = getAlternatingAxis(sourceAxis, i - 1)
    laneValues[i] = getLaneValue(points, i, axis, targetPoint)
  }

  const safeLaneValues: number[] = [Number.NaN]
  for (let i = 1; i < segmentCount; i++) {
    const axis = getAlternatingAxis(sourceAxis, i - 1)
    safeLaneValues[i] = getLaneValue(safePoints, i, axis, targetPoint)
  }

  const srcAxisCoord0 = sourceAxis === "horizontal" ? points[0].x : points[0].y
  const srcAxisCoord1 =
    points.length > 1
      ? sourceAxis === "horizontal"
        ? points[1].x
        : points[1].y
      : srcAxisCoord0
  const srcStubOffset = Math.abs(srcAxisCoord1 - srcAxisCoord0)
  if (Math.abs(srcStubOffset - EDGES.STUB_LENGTH) <= 1) {
    laneValues[1] = getStubExitCoord(
      sourcePosition,
      sourcePoint,
      EDGES.STUB_LENGTH
    )
  }

  if (!isSourceLaneCompatible(sourcePosition, sourcePoint, laneValues[1])) {
    laneValues[1] = safeLaneValues[1]
  }

  const targetLaneIndex = (() => {
    for (let i = segmentCount - 1; i >= 1; i--) {
      if (getAlternatingAxis(sourceAxis, i - 1) === targetAxis) return i
    }
    return 1
  })()

  const lastIdx = points.length - 1
  const tgtAxisCoordLast =
    targetAxis === "horizontal" ? points[lastIdx].x : points[lastIdx].y
  const tgtAxisCoordAtLane =
    targetLaneIndex < points.length
      ? targetAxis === "horizontal"
        ? points[targetLaneIndex].x
        : points[targetLaneIndex].y
      : tgtAxisCoordLast
  const tgtStubOffset = Math.abs(tgtAxisCoordLast - tgtAxisCoordAtLane)
  if (Math.abs(tgtStubOffset - EDGES.STUB_LENGTH) <= 1) {
    laneValues[targetLaneIndex] = getStubExitCoord(
      targetPosition,
      targetPoint,
      EDGES.STUB_LENGTH
    )
  }

  if (segmentCount >= 3 && points.length >= 3) {
    const perpCoord1 = sourceAxis === "horizontal" ? points[1].y : points[1].x
    const perpCoord2 = sourceAxis === "horizontal" ? points[2].y : points[2].x
    if (Math.abs(perpCoord1 - perpCoord2) <= 1) {
      laneValues[2] =
        sourceAxis === "horizontal" ? sourcePoint.y : sourcePoint.x
    }
  }

  let result = buildOrthogonalPathFromLanes(
    laneValues,
    segmentCount,
    sourcePoint,
    targetPoint,
    sourceAxis,
    targetAxis
  )

  if (
    !isTargetApproachCompatible(
      targetPosition,
      result[result.length - 2],
      targetPoint
    )
  ) {
    if (sourceAxis === targetAxis && points.length >= 6) {
      const stubExitCoord = getStubExitCoord(
        targetPosition,
        targetPoint,
        EDGES.STUB_LENGTH
      )
      const stubExitPoint =
        targetAxis === "horizontal"
          ? { x: stubExitCoord, y: targetPoint.y }
          : { x: targetPoint.x, y: stubExitCoord }
      const withStub = removeDuplicatePoints([
        ...result.slice(0, -1),
        stubExitPoint,
        targetPoint,
      ])
      if (
        isTargetApproachCompatible(
          targetPosition,
          withStub[withStub.length - 2],
          targetPoint
        )
      ) {
        result = withStub
      } else {
        laneValues[targetLaneIndex] = safeLaneValues[targetLaneIndex]
        result = buildOrthogonalPathFromLanes(
          laneValues,
          segmentCount,
          sourcePoint,
          targetPoint,
          sourceAxis,
          targetAxis
        )
      }
    } else {
      laneValues[targetLaneIndex] = safeLaneValues[targetLaneIndex]
      result = buildOrthogonalPathFromLanes(
        laneValues,
        segmentCount,
        sourcePoint,
        targetPoint,
        sourceAxis,
        targetAxis
      )
    }
  }

  result = collapseTinyOrthogonalDoglegs(
    result,
    EDGES.ORTHOGONAL_DOGLEG_TOLERANCE_PX
  )

  if (
    !isSourceLaneCompatible(
      sourcePosition,
      sourcePoint,
      getLaneValue(result, 1, getAlternatingAxis(sourceAxis, 0), targetPoint)
    ) ||
    !isTargetApproachCompatible(
      targetPosition,
      result[result.length - 2],
      targetPoint
    ) ||
    hasCollapsingSegments(result) ||
    hasReducedTerminalStub(
      result,
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition
    ) ||
    hasArmCollapse(result, EDGES.ORTHOGONAL_ARM_OVERLAP_PX)
  ) {
    return safePoints
  }

  return result
}

export function getMarkerSegmentPath(
  points: IPoint[],
  offset: number,
  targetPosition: "top" | "bottom" | "left" | "right"
): string {
  if (points.length === 0) return ""

  const lastPoint = points[points.length - 1]
  // Round coordinates to whole pixels for pixel-perfect rendering
  const lastX = Math.round(lastPoint.x)
  const lastY = Math.round(lastPoint.y)
  let extendedX = lastX
  let extendedY = lastY
  switch (targetPosition) {
    case "top":
      extendedY = lastY + offset
      break
    case "bottom":
      extendedY = lastY - offset
      break
    case "left":
      extendedX = lastX + offset
      break
    case "right":
      extendedX = lastX - offset
      break
    default:
      break
  }

  return `M ${lastX} ${lastY} L ${extendedX} ${extendedY}`
}

export const getDefaultEdgeType = (
  diagramType: UMLDiagramType
): DiagramEdgeType => {
  switch (diagramType) {
    case "ClassDiagram":
      return "ClassUnidirectional"
    case "ActivityDiagram":
      return "ActivityControlFlow"

    case "UseCaseDiagram":
      return "UseCaseAssociation"
    case "ComponentDiagram":
      return "ComponentDependency"
    case "DeploymentDiagram":
      return "DeploymentAssociation"
    case "ObjectDiagram":
      return "ObjectLink"
    case "Flowchart":
      return "FlowChartFlowline"
    case "SyntaxTree":
      return "SyntaxTreeLink"
    case "ReachabilityGraph":
      return "ReachabilityGraphArc"
    case "BPMN":
      return "BPMNSequenceFlow"
    case "Sfc":
      return "SfcDiagramEdge"
    case "CommunicationDiagram":
      return "CommunicationLink"
    case "PetriNet":
      return "PetriNetArc"
    default:
      return "ClassUnidirectional"
  }
}

/**
 * Determines the appropriate connection line type based on the diagram type
 * @param diagramType - The type of diagram being rendered
 * @returns The corresponding ConnectionLineType
 */
export function getConnectionLineType(
  diagramType: UMLDiagramType
): ConnectionLineType {
  switch (diagramType) {
    case "UseCaseDiagram":
    case "SyntaxTree":
    case "PetriNet":
      return ConnectionLineType.Straight

    default:
      return ConnectionLineType.Step
  }
}
