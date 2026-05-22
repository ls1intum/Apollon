import { EDGES, INTERFACE } from "@/constants"
import { IPoint, pointsToSvgPath } from "@/edges/Connection"
import { getPositionOnCanvas } from "@/utils/nodeUtils"
import { DiagramEdgeType, UMLDiagramType } from "@/typings"
import {
  Position,
  Rect,
  XYPosition,
  ConnectionLineType,
  Edge,
  Node,
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

interface TextPlacement {
  roleX: number
  roleY: number
  multiplicityX: number
  multiplicityY: number
}

export const calculateTextPlacement = (
  x: number,
  y: number,
  position: Position
): TextPlacement => {
  let roleX = x,
    roleY = y
  let multiplicityX = x,
    multiplicityY = y

  switch (position) {
    case "top":
      roleX = x - 10
      roleY = y - 15
      multiplicityX = x + 10
      multiplicityY = y - 15
      break
    case "right":
      roleX = x + 15
      roleY = y - 10
      multiplicityX = x + 15
      multiplicityY = y + 15
      break
    case "bottom":
      roleX = x - 10
      roleY = y + 15
      multiplicityX = x + 10
      multiplicityY = y + 15
      break
    case "left":
      roleX = x - 15
      roleY = y - 10
      multiplicityX = x - 15
      multiplicityY = y + 15
      break
  }

  return {
    roleX,
    roleY,
    multiplicityX,
    multiplicityY,
  }
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

function distance(p1: XYPosition, p2: XYPosition): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
}

interface FindClosestHandleParams {
  point: XYPosition
  rect: Rect
  useFourHandles?: boolean
}

export function findClosestHandle({
  point,
  rect,
  useFourHandles = false,
}: FindClosestHandleParams): string {
  // Start with basic 4 handles (top, bottom, left, right)
  const points: { label: string; position: XYPosition }[] = [
    { label: "top", position: { x: rect.x + rect.width / 2, y: rect.y } },
    {
      label: "bottom",
      position: { x: rect.x + rect.width / 2, y: rect.y + rect.height },
    },
    { label: "left", position: { x: rect.x, y: rect.y + rect.height / 2 } },
    {
      label: "right",
      position: { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
    },
  ]

  // If not a 4-handle node, append additional handles
  if (!useFourHandles) {
    points.push(
      {
        label: "top-left",
        position: { x: rect.x + rect.width / 3, y: rect.y },
      },
      {
        label: "top-right",
        position: { x: rect.x + (2 / 3) * rect.width, y: rect.y },
      },
      {
        label: "bottom-left",
        position: { x: rect.x + rect.width / 3, y: rect.y + rect.height },
      },
      {
        label: "bottom-right",
        position: { x: rect.x + (2 / 3) * rect.width, y: rect.y + rect.height },
      },
      {
        label: "left-top",
        position: { x: rect.x, y: rect.y + rect.height / 3 },
      },
      {
        label: "left-bottom",
        position: { x: rect.x, y: rect.y + (2 / 3) * rect.height },
      },
      {
        label: "right-top",
        position: { x: rect.x + rect.width, y: rect.y + rect.height / 3 },
      },
      {
        label: "right-bottom",
        position: { x: rect.x + rect.width, y: rect.y + (2 / 3) * rect.height },
      }
    )
  }

  let closest = points[0]
  let minDist = distance(point, points[0].position)

  for (const p of points) {
    const d = distance(point, p.position)
    if (d < minDist) {
      minDist = d
      closest = p
    }
  }

  return closest.label
}

/**
 * Helper function to get handle position on ellipse perimeter
 */
export function getEllipseHandlePosition(
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  handle: string
): { x: number; y: number } {
  const angleMap: { [key: string]: number } = {
    right: 0,
    "right-mid-bottom": Math.PI / 10, // 18°
    "right-bottom": Math.PI / 5, // 36°
    "bottom-right": (3 * Math.PI) / 10, // 54°
    "bottom-mid-right": (2 * Math.PI) / 5, // 72°
    bottom: Math.PI / 2, // 90°
    "bottom-mid-left": (3 * Math.PI) / 5, // 108°
    "bottom-left": (7 * Math.PI) / 10, // 126°
    "left-bottom": (4 * Math.PI) / 5, // 144°
    "left-mid-bottom": (9 * Math.PI) / 10, // 162°
    left: Math.PI, // 180°
    "left-mid-top": (11 * Math.PI) / 10, // 198°
    "left-top": (6 * Math.PI) / 5, // 216°
    "top-left": (13 * Math.PI) / 10, // 234°
    "top-mid-left": (7 * Math.PI) / 5, // 252°
    top: (3 * Math.PI) / 2, // 270°
    "top-mid-right": (8 * Math.PI) / 5, // 288°
    "top-right": (17 * Math.PI) / 10, // 306°
    "right-top": (9 * Math.PI) / 5, // 324°
    "right-mid-top": (19 * Math.PI) / 10, // 342°
  }

  const angle = angleMap[handle] ?? 0

  return {
    x: centerX + radiusX * Math.cos(angle),
    y: centerY + radiusY * Math.sin(angle),
  }
}

const HANDLE_OFFSET_RATIO: Record<string, number> = {
  "top-left": 0.2,
  "top-mid-left": 0.35,
  top: 0.5,
  "top-mid-right": 0.65,
  "top-right": 0.8,
  "right-top": 0.2,
  "right-mid-top": 0.35,
  right: 0.5,
  "right-mid-bottom": 0.65,
  "right-bottom": 0.8,
  "bottom-right": 0.8,
  "bottom-mid-right": 0.65,
  bottom: 0.5,
  "bottom-mid-left": 0.35,
  "bottom-left": 0.2,
  "left-bottom": 0.8,
  "left-mid-bottom": 0.65,
  left: 0.5,
  "left-mid-top": 0.35,
  "left-top": 0.2,
}

export function getHandleSideFromId(handleId?: string | null): Position {
  if (!handleId) return Position.Right

  if (handleId.startsWith("top")) return Position.Top
  if (handleId.startsWith("bottom")) return Position.Bottom
  if (handleId.startsWith("left")) return Position.Left
  if (handleId.startsWith("right")) return Position.Right

  return Position.Right
}

const getHandleOffsetRatio = (handleId?: string | null): number => {
  if (!handleId) return 0.5
  return HANDLE_OFFSET_RATIO[handleId] ?? 0.5
}

export function getHandlePositionOnNode({
  nodeType,
  nodePosition,
  width,
  height,
  handleId,
}: {
  nodeType?: string
  nodePosition: XYPosition
  width: number
  height: number
  handleId?: string | null
}): IPoint {
  if (nodeType === "useCase") {
    const ellipsePositiveEdgeInset = 0.5
    const centerX = width / 2 - ellipsePositiveEdgeInset / 2
    const centerY = height / 2 - ellipsePositiveEdgeInset / 2
    const radiusX = width / 2 - ellipsePositiveEdgeInset / 2
    const radiusY = height / 2 - ellipsePositiveEdgeInset / 2

    const pos = getEllipseHandlePosition(
      centerX,
      centerY,
      radiusX,
      radiusY,
      handleId ?? "right"
    )

    return {
      x: nodePosition.x + pos.x,
      y: nodePosition.y + pos.y,
    }
  }

  const ratio = getHandleOffsetRatio(handleId)
  const side = getHandleSideFromId(handleId)

  switch (side) {
    case Position.Top:
      return { x: nodePosition.x + width * ratio, y: nodePosition.y }
    case Position.Bottom:
      return { x: nodePosition.x + width * ratio, y: nodePosition.y + height }
    case Position.Left:
      return { x: nodePosition.x, y: nodePosition.y + height * ratio }
    case Position.Right:
    default:
      return {
        x: nodePosition.x + width,
        y: nodePosition.y + height * ratio,
      }
  }
}

const STRAIGHT_EDGE_TYPES = new Set([
  "UseCaseAssociation",
  "UseCaseInclude",
  "UseCaseExtend",
  "UseCaseGeneralization",
  "SyntaxTreeLink",
  "PetriNetArc",
])

export const isStraightEdgeType = (edgeType?: string | null): boolean =>
  STRAIGHT_EDGE_TYPES.has(edgeType ?? "")

type EdgeGeometryMap = Map<string, IPoint[]>

const edgeGeometryCache = new WeakMap<
  ReadonlyArray<Edge>,
  WeakMap<ReadonlyArray<Node>, EdgeGeometryMap>
>()

export const getEdgeGeometryMap = (
  edges: ReadonlyArray<Edge>,
  nodes: ReadonlyArray<Node>
): EdgeGeometryMap => {
  const cachedByEdges = edgeGeometryCache.get(edges)
  const cached = cachedByEdges?.get(nodes)
  if (cached) return cached

  const geometryMap: EdgeGeometryMap = new Map()
  const nodesById = new Map(nodes.map((node) => [node.id, node]))

  for (const edge of edges) {
    const storedPoints = (edge.data as { points?: IPoint[] } | undefined)
      ?.points
    if (storedPoints && storedPoints.length > 1) {
      geometryMap.set(edge.id, storedPoints)
      continue
    }

    const sourceNode = nodesById.get(edge.source)
    const targetNode = nodesById.get(edge.target)

    if (!sourceNode || !targetNode) {
      continue
    }

    const sourceWidth = sourceNode.width ?? sourceNode.measured?.width ?? 100
    const sourceHeight = sourceNode.height ?? sourceNode.measured?.height ?? 100
    const targetWidth = targetNode.width ?? targetNode.measured?.width ?? 100
    const targetHeight = targetNode.height ?? targetNode.measured?.height ?? 100

    const mutableNodes = nodes as Node[]
    const sourcePositionOnCanvas = getPositionOnCanvas(sourceNode, mutableNodes)
    const targetPositionOnCanvas = getPositionOnCanvas(targetNode, mutableNodes)

    const sourceHandle = edge.sourceHandle ?? "right"
    const targetHandle = edge.targetHandle ?? "left"

    const sourcePoint = getHandlePositionOnNode({
      nodeType: sourceNode.type,
      nodePosition: sourcePositionOnCanvas,
      width: sourceWidth,
      height: sourceHeight,
      handleId: sourceHandle,
    })
    const targetPoint = getHandlePositionOnNode({
      nodeType: targetNode.type,
      nodePosition: targetPositionOnCanvas,
      width: targetWidth,
      height: targetHeight,
      handleId: targetHandle,
    })

    if (isStraightEdgeType(edge.type)) {
      geometryMap.set(edge.id, [sourcePoint, targetPoint])
      continue
    }

    const sourceHandleSide = getHandleSideFromId(sourceHandle)
    const targetHandleSide = getHandleSideFromId(targetHandle)
    const { markerPadding } = getEdgeMarkerStyles(edge.type ?? "")
    const padding = markerPadding ?? EDGES.MARKER_PADDING

    const adjustedTarget = adjustTargetCoordinates(
      Math.round(targetPoint.x),
      Math.round(targetPoint.y),
      targetHandleSide,
      padding
    )
    const adjustedSource = adjustSourceCoordinates(
      Math.round(sourcePoint.x),
      Math.round(sourcePoint.y),
      sourceHandleSide,
      EDGES.SOURCE_CONNECTION_POINT_PADDING
    )

    const [edgePath] = getSmoothStepPath({
      sourceX: adjustedSource.sourceX,
      sourceY: adjustedSource.sourceY,
      sourcePosition: sourceHandleSide,
      targetX: adjustedTarget.targetX,
      targetY: adjustedTarget.targetY,
      targetPosition: targetHandleSide,
      borderRadius: EDGES.STEP_BORDER_RADIUS,
      offset: 30,
    })

    const simplifiedPath = simplifySvgPath(edgePath)
    const points = removeDuplicatePoints(parseSvgPath(simplifiedPath))
    if (points.length > 1) {
      geometryMap.set(edge.id, points)
    }
  }

  const nextByEdges = cachedByEdges ?? new WeakMap()
  nextByEdges.set(nodes, geometryMap)
  if (!cachedByEdges) {
    edgeGeometryCache.set(edges, nextByEdges)
  }

  return geometryMap
}

export type AxisAlignedSegment = {
  index: number
  start: IPoint
  end: IPoint
  orientation: "horizontal" | "vertical"
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
  orientation: "horizontal" | "vertical"
}

export function findLineJumpIntersections(
  baseSegments: AxisAlignedSegment[],
  otherSegments: AxisAlignedSegment[],
  jumpWidth: number,
  preferredOrientation: "horizontal" | "vertical" | "any" = "horizontal",
  tolerance: number = 1
): LineJumpHit[] {
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
          y < other.min - tolerance ||
          y > other.max + tolerance
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
          x < other.min - tolerance ||
          x > other.max + tolerance
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

export function findLineJumpIntersection(
  baseSegments: AxisAlignedSegment[],
  otherSegments: AxisAlignedSegment[],
  jumpWidth: number,
  preferredOrientation: "horizontal" | "vertical" | "any" = "horizontal",
  tolerance: number = 1
): LineJumpHit | null {
  const hits = findLineJumpIntersections(
    baseSegments,
    otherSegments,
    jumpWidth,
    preferredOrientation,
    tolerance
  )

  return hits.length > 0 ? hits[0] : null
}

export function buildPathWithLineJumpAtPoint(
  points: IPoint[],
  segmentIndex: number,
  jumpCenter: IPoint,
  jumpHeight: number,
  jumpWidth: number = EDGES.EDGE_LINE_JUMP_WIDTH
): string {
  if (points.length === 0) return ""
  if (segmentIndex < 0 || segmentIndex >= points.length - 1) {
    return pointsToSvgPath(points)
  }

  const start = points[segmentIndex]
  const end = points[segmentIndex + 1]
  const isHorizontal = Math.abs(start.y - end.y) < 1
  const segmentLength = isHorizontal
    ? Math.abs(end.x - start.x)
    : Math.abs(end.y - start.y)

  if (segmentLength < jumpWidth * 1.2) {
    return pointsToSvgPath(points)
  }

  const round = (num: number) => Math.round(num)
  const halfJump = Math.min(jumpWidth / 2, segmentLength / 2 - 2)
  if (halfJump <= 1) {
    return pointsToSvgPath(points)
  }

  const jumpStart = isHorizontal
    ? { x: jumpCenter.x - halfJump, y: start.y }
    : { x: start.x, y: jumpCenter.y - halfJump }
  const jumpEnd = isHorizontal
    ? { x: jumpCenter.x + halfJump, y: start.y }
    : { x: start.x, y: jumpCenter.y + halfJump }
  const control = isHorizontal
    ? { x: jumpCenter.x, y: start.y - Math.abs(jumpHeight) }
    : { x: start.x + Math.abs(jumpHeight), y: jumpCenter.y }

  const pathParts = [`M ${round(points[0].x)},${round(points[0].y)}`]

  for (let i = 0; i < points.length - 1; i += 1) {
    const segmentEnd = points[i + 1]

    if (i === segmentIndex) {
      pathParts.push(
        `L ${round(jumpStart.x)},${round(jumpStart.y)}`,
        `Q ${round(control.x)},${round(control.y)} ${round(
          jumpEnd.x
        )},${round(jumpEnd.y)}`
      )

      if (
        Math.abs(jumpEnd.x - segmentEnd.x) > 0.5 ||
        Math.abs(jumpEnd.y - segmentEnd.y) > 0.5
      ) {
        pathParts.push(`L ${round(segmentEnd.x)},${round(segmentEnd.y)}`)
      }
    } else {
      pathParts.push(`L ${round(segmentEnd.x)},${round(segmentEnd.y)}`)
    }
  }

  return pathParts.join(" ")
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
  const jumpsBySegment = new Map<number, LineJumpHit[]>()

  for (const jump of jumps) {
    const list = jumpsBySegment.get(jump.segmentIndex) ?? []
    list.push(jump)
    jumpsBySegment.set(jump.segmentIndex, list)
  }

  const pathParts = [`M ${round(points[0].x)},${round(points[0].y)}`]

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i]
    const end = points[i + 1]
    const isHorizontal = Math.abs(start.y - end.y) < 1
    const segmentLength = isHorizontal
      ? Math.abs(end.x - start.x)
      : Math.abs(end.y - start.y)

    const segmentJumps = jumpsBySegment.get(i)
    if (!segmentJumps || segmentJumps.length === 0) {
      pathParts.push(`L ${round(end.x)},${round(end.y)}`)
      continue
    }

    if (segmentLength < jumpWidth * 1.2) {
      pathParts.push(`L ${round(end.x)},${round(end.y)}`)
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

      pathParts.push(
        `L ${round(jumpStart.x)},${round(jumpStart.y)}`,
        `Q ${round(control.x)},${round(control.y)} ${round(
          jumpEnd.x
        )},${round(jumpEnd.y)}`
      )

      lastCoord = coord
    }

    pathParts.push(`L ${round(end.x)},${round(end.y)}`)
  }

  return pathParts.join(" ")
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

export function calculateInnerMidpoints(
  points: IPoint[],
  decimals: number = 2
): IPoint[] {
  const round = (num: number) => Number(num.toFixed(decimals))
  const midpoints: IPoint[] = []
  if (points.length < 3) return midpoints

  // Group consecutive points that form straight lines (horizontal or vertical)
  const segments: IPoint[][] = []
  let currentSegment: IPoint[] = [points[0]]

  for (let i = 1; i < points.length; i++) {
    const prevPoint = currentSegment[currentSegment.length - 1]
    const currentPoint = points[i]

    // Check if this point continues the current segment (same direction)
    const isHorizontal = Math.abs(prevPoint.y - currentPoint.y) < 0.1
    const isVertical = Math.abs(prevPoint.x - currentPoint.x) < 0.1

    if (currentSegment.length === 1) {
      // First segment, just add the point
      currentSegment.push(currentPoint)
    } else {
      // Check if the new point continues the same direction as the current segment
      const segmentStart = currentSegment[0]
      const segmentPrev = currentSegment[currentSegment.length - 1]
      const wasHorizontal = Math.abs(segmentStart.y - segmentPrev.y) < 0.1
      const wasVertical = Math.abs(segmentStart.x - segmentPrev.x) < 0.1

      if ((wasHorizontal && isHorizontal) || (wasVertical && isVertical)) {
        // Continue current segment
        currentSegment.push(currentPoint)
      } else {
        // Start new segment
        segments.push([...currentSegment])
        currentSegment = [prevPoint, currentPoint]
      }
    }
  }

  // Add the last segment
  if (currentSegment.length > 1) {
    segments.push(currentSegment)
  }

  // Calculate one midpoint per segment (excluding first and last segments to avoid endpoints)
  for (let i = 1; i < segments.length - 1; i++) {
    const segment = segments[i]
    if (segment.length >= 2) {
      const start = segment[0]
      const end = segment[segment.length - 1]
      const midpoint = {
        x: round((start.x + end.x) / 2),
        y: round((start.y + end.y) / 2),
      }
      midpoints.push(midpoint)
    }
  }

  return midpoints
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
