import {
  CSS_VARIABLE_FALLBACKS,
  EDGES,
  FILL_COLOR,
  INTERFACE,
  LAYOUT,
  MARKER_CONFIGS,
  MARKERS,
  STROKE_COLOR,
} from "@/constants"
import { tryFindStraightPath } from "@/edges/Connection"
import {
  ClassNodeElement,
  ClassNodeProps,
  ClassType,
  DefaultNodeProps,
  UMLDiagramType,
} from "@/types"
import { ApollonEdge, ApollonNode, SVG, UMLModel } from "@/typings"
import { Position, getSmoothStepPath } from "@xyflow/react"
import {
  adjustSourceCoordinates,
  adjustTargetCoordinates,
  calculateDynamicEdgeLabels,
  getEdgeMarkerStyles,
  parseSvgPath,
  removeDuplicatePoints,
  simplifySvgPath,
} from "./edgeUtils"
import { extractMarkerId } from "./pathParsing"

type Point = {
  x: number
  y: number
}

type Bounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

type MarkerId = keyof typeof MARKER_CONFIGS | null

type Side = "left" | "right" | "top" | "bottom"

type NodeLayout = {
  node: ApollonNode
  x: number
  y: number
  width: number
  height: number
}

type EdgeLabelFields = {
  sourceRole?: string | null
  sourceMultiplicity?: string | null
  targetRole?: string | null
  targetMultiplicity?: string | null
}

type EdgeLayout = {
  edge: ApollonEdge
  points: Point[]
  strokeColor: string
  textColor: string
  markerId: MarkerId
  dashed: boolean
  labels: EdgeLabelFields
}

export type FlatSvgExportOptions = {
  margin?: number
  background?: "white" | "transparent"
  fontFamily?: string
  fontSize?: number
}

const SVG_NS = "http://www.w3.org/2000/svg"
const PACKAGE_TAB_HEIGHT = 10
const DEFAULT_MARGIN = 10
const DEFAULT_FONT_SIZE = 16
const DEFAULT_FONT_FAMILY = "Arial, Helvetica, sans-serif"

const DASHED_CLASS_EDGE_TYPES = new Set(["ClassDependency", "ClassRealization"])

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return value
}

const formatNumber = (value: number): string => {
  const rounded = Number(value.toFixed(2))
  return `${rounded}`
}

const resolveCssVar = (value: string): string => {
  const varMatch = value.match(/var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)/)
  if (!varMatch) {
    return value
  }
  const variableName = varMatch[1].trim()
  const fallback = varMatch[2]?.trim()
  return CSS_VARIABLE_FALLBACKS[variableName] ?? fallback ?? value
}

const resolveColor = (value: unknown, fallback: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback
  }
  return resolveCssVar(value.trim())
}

const getNodeSize = (node: ApollonNode): { width: number; height: number } => {
  const measuredWidth = toFiniteNumber(node.measured?.width) ?? 0
  const measuredHeight = toFiniteNumber(node.measured?.height) ?? 0
  const width = Math.max(1, toFiniteNumber(node.width) ?? measuredWidth ?? 1)
  const height = Math.max(1, toFiniteNumber(node.height) ?? measuredHeight ?? 1)
  return { width, height }
}

const ensureBounds = (): Bounds => ({
  minX: Number.POSITIVE_INFINITY,
  minY: Number.POSITIVE_INFINITY,
  maxX: Number.NEGATIVE_INFINITY,
  maxY: Number.NEGATIVE_INFINITY,
})

const expandBoundsWithPoint = (bounds: Bounds, point: Point): void => {
  bounds.minX = Math.min(bounds.minX, point.x)
  bounds.minY = Math.min(bounds.minY, point.y)
  bounds.maxX = Math.max(bounds.maxX, point.x)
  bounds.maxY = Math.max(bounds.maxY, point.y)
}

const expandBoundsWithRect = (
  bounds: Bounds,
  x: number,
  y: number,
  width: number,
  height: number
): void => {
  expandBoundsWithPoint(bounds, { x, y })
  expandBoundsWithPoint(bounds, { x: x + width, y: y + height })
}

const estimateTextWidth = (text: string, fontSize: number): number => {
  return text.length * fontSize * 0.56
}

const expandBoundsWithText = (
  bounds: Bounds,
  text: string,
  x: number,
  y: number,
  textAnchor: "start" | "middle" | "end",
  fontSize: number
): void => {
  if (!text) return
  const textWidth = estimateTextWidth(text, fontSize)
  const textHeight = fontSize
  let left = x
  if (textAnchor === "middle") {
    left = x - textWidth / 2
  } else if (textAnchor === "end") {
    left = x - textWidth
  }
  const top = y - textHeight
  expandBoundsWithRect(bounds, left, top, textWidth, textHeight)
}

const createSvgElement = <T extends keyof SVGElementTagNameMap>(
  tag: T
): SVGElementTagNameMap[T] => {
  return document.createElementNS(SVG_NS, tag)
}

const setAttr = (
  element: Element,
  attrs: Record<string, string | number>
): void => {
  Object.entries(attrs).forEach(([key, value]) => {
    element.setAttribute(
      key,
      typeof value === "number" ? formatNumber(value) : value
    )
  })
}

const normalizeHandle = (handle: string | undefined): string => {
  return (handle ?? "").toLowerCase()
}

const getHandleSide = (
  handle: string | undefined,
  fallbackSide: Side
): Side => {
  const normalized = normalizeHandle(handle)
  if (normalized.includes("left")) return "left"
  if (normalized.includes("right")) return "right"
  if (normalized.includes("top")) return "top"
  if (normalized.includes("bottom")) return "bottom"
  return fallbackSide
}

const getHandlePoint = (
  nodeLayout: NodeLayout,
  handle: string | undefined,
  fallbackSide: Side
): { point: Point; side: Side } => {
  const normalized = normalizeHandle(handle)
  const { x, y, width, height } = nodeLayout
  const oneThirdX = x + width / 3
  const twoThirdX = x + (2 * width) / 3
  const oneThirdY = y + height / 3
  const twoThirdY = y + (2 * height) / 3

  const side = getHandleSide(handle, fallbackSide)

  if (normalized.includes("top-left"))
    return { point: { x: oneThirdX, y }, side }
  if (normalized.includes("top-right"))
    return { point: { x: twoThirdX, y }, side }
  if (normalized.includes("bottom-left")) {
    return { point: { x: oneThirdX, y: y + height }, side }
  }
  if (normalized.includes("bottom-right")) {
    return { point: { x: twoThirdX, y: y + height }, side }
  }
  if (normalized.includes("left-top"))
    return { point: { x, y: oneThirdY }, side }
  if (normalized.includes("left-bottom"))
    return { point: { x, y: twoThirdY }, side }
  if (normalized.includes("right-top")) {
    return { point: { x: x + width, y: oneThirdY }, side }
  }
  if (normalized.includes("right-bottom")) {
    return { point: { x: x + width, y: twoThirdY }, side }
  }
  if (normalized.includes("top"))
    return { point: { x: x + width / 2, y }, side }
  if (normalized.includes("bottom")) {
    return { point: { x: x + width / 2, y: y + height }, side }
  }
  if (normalized.includes("left"))
    return { point: { x, y: y + height / 2 }, side }
  if (normalized.includes("right")) {
    return { point: { x: x + width, y: y + height / 2 }, side }
  }

  if (side === "left") {
    return { point: { x, y: y + height / 2 }, side }
  }
  if (side === "right") {
    return { point: { x: x + width, y: y + height / 2 }, side }
  }
  if (side === "top") {
    return { point: { x: x + width / 2, y }, side }
  }
  return { point: { x: x + width / 2, y: y + height }, side }
}

const sanitizePoints = (points: unknown): Point[] => {
  if (!Array.isArray(points)) return []
  return points
    .map((point) => {
      if (!point || typeof point !== "object") return null
      const maybeX = toFiniteNumber((point as { x?: number }).x)
      const maybeY = toFiniteNumber((point as { y?: number }).y)
      if (maybeX == null || maybeY == null) return null
      return { x: maybeX, y: maybeY }
    })
    .filter((point): point is Point => point != null)
}

const deduplicateConsecutivePoints = (points: Point[]): Point[] => {
  if (points.length < 2) return points
  const deduplicated: Point[] = [points[0]]
  for (let index = 1; index < points.length; index += 1) {
    const previous = deduplicated[deduplicated.length - 1]
    const current = points[index]
    if (previous.x !== current.x || previous.y !== current.y) {
      deduplicated.push(current)
    }
  }
  return deduplicated
}

const simplifyCollinearPoints = (points: Point[]): Point[] => {
  if (points.length < 3) return points
  const simplified: Point[] = [points[0]]
  for (let index = 1; index < points.length - 1; index += 1) {
    const prev = simplified[simplified.length - 1]
    const current = points[index]
    const next = points[index + 1]
    const sameX = prev.x === current.x && current.x === next.x
    const sameY = prev.y === current.y && current.y === next.y
    if (!sameX && !sameY) {
      simplified.push(current)
    }
  }
  simplified.push(points[points.length - 1])
  return simplified
}

const offsetFromSide = (point: Point, side: Side, offset: number): Point => {
  switch (side) {
    case "left":
      return { x: point.x - offset, y: point.y }
    case "right":
      return { x: point.x + offset, y: point.y }
    case "top":
      return { x: point.x, y: point.y - offset }
    case "bottom":
      return { x: point.x, y: point.y + offset }
    default:
      return point
  }
}

const sideToPosition = (side: Side): Position => {
  switch (side) {
    case "left":
      return Position.Left
    case "right":
      return Position.Right
    case "top":
      return Position.Top
    case "bottom":
      return Position.Bottom
    default:
      return Position.Right
  }
}

const getAdjustedEndpoints = (
  edgeType: string,
  sourcePoint: Point,
  sourceSide: Side,
  targetPoint: Point,
  targetSide: Side
): {
  sourcePoint: Point
  targetPoint: Point
  sourcePosition: Position
  targetPosition: Position
  markerPadding: number
} => {
  const sourcePosition = sideToPosition(sourceSide)
  const targetPosition = sideToPosition(targetSide)
  const markerPadding =
    getEdgeMarkerStyles(edgeType).markerPadding ?? EDGES.MARKER_PADDING

  const adjustedSource = adjustSourceCoordinates(
    Math.round(sourcePoint.x),
    Math.round(sourcePoint.y),
    sourcePosition,
    EDGES.SOURCE_CONNECTION_POINT_PADDING
  )
  const adjustedTarget = adjustTargetCoordinates(
    Math.round(targetPoint.x),
    Math.round(targetPoint.y),
    targetPosition,
    markerPadding
  )

  return {
    sourcePoint: { x: adjustedSource.sourceX, y: adjustedSource.sourceY },
    targetPoint: { x: adjustedTarget.targetX, y: adjustedTarget.targetY },
    sourcePosition,
    targetPosition,
    markerPadding,
  }
}

const buildRuntimeLikeClassEdgePoints = (
  edge: ApollonEdge,
  sourceLayout: NodeLayout,
  sourceSide: Side,
  sourcePoint: Point,
  targetLayout: NodeLayout,
  targetSide: Side,
  targetPoint: Point
): Point[] => {
  const adjusted = getAdjustedEndpoints(
    edge.type,
    sourcePoint,
    sourceSide,
    targetPoint,
    targetSide
  )

  const straightPathPoints = tryFindStraightPath(
    {
      position: { x: sourceLayout.x, y: sourceLayout.y },
      width: sourceLayout.width,
      height: sourceLayout.height,
      direction: adjusted.sourcePosition,
    },
    {
      position: { x: targetLayout.x, y: targetLayout.y },
      width: targetLayout.width,
      height: targetLayout.height,
      direction: adjusted.targetPosition,
    },
    adjusted.markerPadding
  )
  if (straightPathPoints && straightPathPoints.length >= 2) {
    return deduplicateConsecutivePoints(
      straightPathPoints.map((point) => ({ x: point.x, y: point.y }))
    )
  }

  const [edgePath] = getSmoothStepPath({
    sourceX: adjusted.sourcePoint.x,
    sourceY: adjusted.sourcePoint.y,
    sourcePosition: adjusted.sourcePosition,
    targetX: adjusted.targetPoint.x,
    targetY: adjusted.targetPoint.y,
    targetPosition: adjusted.targetPosition,
    borderRadius: EDGES.STEP_BORDER_RADIUS,
    offset: 30,
  })

  const parsedPoints = removeDuplicatePoints(
    parseSvgPath(simplifySvgPath(edgePath))
  ).map((point) => ({ x: point.x, y: point.y }))

  return deduplicateConsecutivePoints(parsedPoints)
}

const buildOrthogonalStepPoints = (
  sourcePoint: Point,
  sourceSide: Side,
  targetPoint: Point,
  targetSide: Side
): Point[] => {
  const breakout = 24
  const sourceOut = offsetFromSide(sourcePoint, sourceSide, breakout)
  const targetOut = offsetFromSide(targetPoint, targetSide, breakout)
  const sourceHorizontal = sourceSide === "left" || sourceSide === "right"
  const targetHorizontal = targetSide === "left" || targetSide === "right"
  const points: Point[] = [sourcePoint, sourceOut]

  if (sourceHorizontal && targetHorizontal) {
    const midX = (sourceOut.x + targetOut.x) / 2
    points.push({ x: midX, y: sourceOut.y })
    points.push({ x: midX, y: targetOut.y })
  } else if (!sourceHorizontal && !targetHorizontal) {
    const midY = (sourceOut.y + targetOut.y) / 2
    points.push({ x: sourceOut.x, y: midY })
    points.push({ x: targetOut.x, y: midY })
  } else if (sourceHorizontal) {
    points.push({ x: targetOut.x, y: sourceOut.y })
  } else {
    points.push({ x: sourceOut.x, y: targetOut.y })
  }

  points.push(targetOut)
  points.push(targetPoint)
  return simplifyCollinearPoints(deduplicateConsecutivePoints(points))
}

const vectorLength = (vector: Point): number => {
  return Math.hypot(vector.x, vector.y)
}

const normalizeVector = (vector: Point): Point => {
  const length = vectorLength(vector)
  if (length === 0) return { x: 1, y: 0 }
  return { x: vector.x / length, y: vector.y / length }
}

const getLastSegmentDirection = (points: Point[]): Point => {
  if (points.length < 2) return { x: 1, y: 0 }
  const end = points[points.length - 1]
  for (let index = points.length - 2; index >= 0; index -= 1) {
    const start = points[index]
    const direction = { x: end.x - start.x, y: end.y - start.y }
    if (vectorLength(direction) > 0) {
      return normalizeVector(direction)
    }
  }
  return { x: 1, y: 0 }
}

const toAbsolutePath = (points: Point[]): string => {
  if (points.length === 0) return ""
  const commands = [
    `M ${formatNumber(points[0].x)} ${formatNumber(points[0].y)}`,
  ]
  for (let index = 1; index < points.length; index += 1) {
    commands.push(
      `L ${formatNumber(points[index].x)} ${formatNumber(points[index].y)}`
    )
  }
  return commands.join(" ")
}

const resolveEdgeMarkerId = (edgeType: string): MarkerId => {
  const markerEnd = getEdgeMarkerStyles(edgeType).markerEnd
  const markerId = extractMarkerId(markerEnd)
  if (!markerId) return null
  return markerId in MARKER_CONFIGS
    ? (markerId as keyof typeof MARKER_CONFIGS)
    : null
}

const isDashedClassEdge = (edgeType: string): boolean => {
  return DASHED_CLASS_EDGE_TYPES.has(edgeType)
}

const renderMarker = (
  markerId: MarkerId,
  endPoint: Point,
  direction: Point,
  strokeColor: string
): { element: SVGElement | null; markerBounds: Point[] } => {
  if (!markerId) {
    return { element: null, markerBounds: [] }
  }

  const config = MARKER_CONFIGS[markerId]
  const radians = Math.atan2(direction.y, direction.x)
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const transformRounded = (x: number, y: number): Point => ({
    x: Math.round(endPoint.x + x * cos - y * sin),
    y: Math.round(endPoint.y + x * sin + y * cos),
  })
  const transformExact = (x: number, y: number): Point => ({
    x: endPoint.x + x * cos - y * sin,
    y: endPoint.y + x * sin + y * cos,
  })
  const fillColor = config.filled ? strokeColor : FILL_COLOR

  if (config.type === "triangle") {
    const strokeW = MARKERS.STROKE_WIDTH.triangle
    const length = config.size * (config.widthFactor ?? 1)
    const height = config.size * (config.heightFactor ?? 1)
    const tip = transformRounded(0, 0)
    const left = transformRounded(-length, -height / 2)
    const right = transformRounded(-length, height / 2)
    const path = createSvgElement("path")
    setAttr(path, {
      d: `M${tip.x},${tip.y} L${left.x},${left.y} L${right.x},${right.y} Z`,
      fill: fillColor,
      stroke: strokeColor,
      "stroke-width": strokeW,
      "data-inline-marker": "true",
    })
    return { element: path, markerBounds: [tip, left, right] }
  }

  if (config.type === "arrow") {
    const strokeW = MARKERS.STROKE_WIDTH.arrow
    const length = config.size * (config.widthFactor ?? 1)
    const height = config.size * (config.heightFactor ?? 0.7)
    const tip = transformRounded(0, 0)
    const left = transformRounded(-length, -height / 2)
    const right = transformRounded(-length, height / 2)
    const path = createSvgElement("path")
    if (config.filled) {
      setAttr(path, {
        d: `M${left.x},${left.y} L${tip.x},${tip.y} L${right.x},${right.y} Z`,
        fill: strokeColor,
        stroke: strokeColor,
        "stroke-width": strokeW,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "data-inline-marker": "true",
      })
    } else {
      setAttr(path, {
        d: `M${left.x},${left.y} L${tip.x},${tip.y} L${right.x},${right.y}`,
        fill: "none",
        stroke: strokeColor,
        "stroke-width": strokeW,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "data-inline-marker": "true",
      })
    }
    return { element: path, markerBounds: [tip, left, right] }
  }

  if (config.type === "rhombus") {
    const strokeW = MARKERS.STROKE_WIDTH.rhombus
    const width = config.size * (config.widthFactor ?? 1)
    const height = config.size * (config.heightFactor ?? 1)
    const front = transformRounded(0, 0)
    const right = transformRounded(-width / 2, height / 2)
    const back = transformRounded(-width, 0)
    const left = transformRounded(-width / 2, -height / 2)
    const path = createSvgElement("path")
    setAttr(path, {
      d: `M${front.x},${front.y} L${right.x},${right.y} L${back.x},${back.y} L${left.x},${left.y} Z`,
      fill: fillColor,
      stroke: strokeColor,
      "stroke-width": strokeW,
      "data-inline-marker": "true",
    })
    return { element: path, markerBounds: [front, right, back, left] }
  }

  if (config.type === "circle") {
    const strokeW = MARKERS.STROKE_WIDTH.circle
    const r = config.size / 2
    const center = transformRounded(-r - strokeW / 2, 0)
    const circle = createSvgElement("circle")
    setAttr(circle, {
      cx: center.x,
      cy: center.y,
      r,
      fill: fillColor,
      stroke: strokeColor,
      "stroke-width": strokeW,
      "data-inline-marker": "true",
    })
    return {
      element: circle,
      markerBounds: [
        { x: center.x - r, y: center.y - r },
        { x: center.x + r, y: center.y + r },
      ],
    }
  }

  if (config.type === "semicircle") {
    const strokeW = MARKERS.STROKE_WIDTH.semicircle
    const gap = 2
    const r = INTERFACE.RADIUS + gap
    const arcSpanDegrees = config.arcSpanDegrees ?? 180
    const halfAngle = ((arcSpanDegrees / 2) * Math.PI) / 180
    const cosHalf = Math.cos(halfAngle)
    const sinHalf = Math.sin(halfAngle)
    const largeArcFlag = arcSpanDegrees > 180 ? 1 : 0
    const top = transformExact(r * (1 - cosHalf), -r * sinHalf)
    const bottom = transformExact(r * (1 - cosHalf), r * sinHalf)
    const path = createSvgElement("path")
    setAttr(path, {
      d: `M${formatNumber(top.x)},${formatNumber(top.y)} A${formatNumber(r)},${formatNumber(r)} 0 ${largeArcFlag},0 ${formatNumber(bottom.x)},${formatNumber(bottom.y)}`,
      fill: "none",
      stroke: strokeColor,
      "stroke-width": strokeW,
      "data-inline-marker": "true",
    })
    return { element: path, markerBounds: [top, bottom] }
  }

  return {
    element: null,
    markerBounds: [],
  }
}

const toDirection = (
  from: Point,
  to: Point
): "top" | "bottom" | "left" | "right" => {
  const deltaX = to.x - from.x
  const deltaY = to.y - from.y
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    return deltaX >= 0 ? "right" : "left"
  }
  return deltaY >= 0 ? "bottom" : "top"
}

const asText = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

const buildNodeLayouts = (model: UMLModel): Map<string, NodeLayout> => {
  const nodeById = new Map<string, ApollonNode>(
    model.nodes.map((node) => [node.id, node])
  )
  const memo = new Map<string, { x: number; y: number }>()

  const absolutePosition = (node: ApollonNode): { x: number; y: number } => {
    const memoized = memo.get(node.id)
    if (memoized) return memoized

    const ownX = toFiniteNumber(node.position?.x) ?? 0
    const ownY = toFiniteNumber(node.position?.y) ?? 0
    if (!node.parentId) {
      const result = { x: ownX, y: ownY }
      memo.set(node.id, result)
      return result
    }

    const parentNode = nodeById.get(node.parentId)
    if (!parentNode || parentNode.id === node.id) {
      const result = { x: ownX, y: ownY }
      memo.set(node.id, result)
      return result
    }

    const parentPos = absolutePosition(parentNode)
    const result = { x: parentPos.x + ownX, y: parentPos.y + ownY }
    memo.set(node.id, result)
    return result
  }

  const layouts = new Map<string, NodeLayout>()
  model.nodes.forEach((node) => {
    const pos = absolutePosition(node)
    const size = getNodeSize(node)
    layouts.set(node.id, {
      node,
      x: pos.x,
      y: pos.y,
      width: size.width,
      height: size.height,
    })
  })
  return layouts
}

const buildEdgePoints = (
  edge: ApollonEdge,
  nodeLayouts: Map<string, NodeLayout>
): Point[] => {
  const explicitPoints = deduplicateConsecutivePoints(
    sanitizePoints((edge.data as { points?: unknown })?.points)
  )

  const sourceLayout = nodeLayouts.get(edge.source)
  const targetLayout = nodeLayouts.get(edge.target)
  if (!sourceLayout || !targetLayout) {
    return explicitPoints.length >= 2 ? explicitPoints : []
  }

  const sourceCenter = {
    x: sourceLayout.x + sourceLayout.width / 2,
    y: sourceLayout.y + sourceLayout.height / 2,
  }
  const targetCenter = {
    x: targetLayout.x + targetLayout.width / 2,
    y: targetLayout.y + targetLayout.height / 2,
  }

  const horizontalDominant =
    Math.abs(targetCenter.x - sourceCenter.x) >=
    Math.abs(targetCenter.y - sourceCenter.y)

  const sourceFallbackSide: Side = horizontalDominant
    ? sourceCenter.x <= targetCenter.x
      ? "right"
      : "left"
    : sourceCenter.y <= targetCenter.y
      ? "bottom"
      : "top"

  const targetFallbackSide: Side = horizontalDominant
    ? sourceCenter.x <= targetCenter.x
      ? "left"
      : "right"
    : sourceCenter.y <= targetCenter.y
      ? "top"
      : "bottom"

  const sourceHandle = getHandlePoint(
    sourceLayout,
    edge.sourceHandle,
    sourceFallbackSide
  )
  const targetHandle = getHandlePoint(
    targetLayout,
    edge.targetHandle,
    targetFallbackSide
  )

  const adjusted = getAdjustedEndpoints(
    edge.type,
    sourceHandle.point,
    sourceHandle.side,
    targetHandle.point,
    targetHandle.side
  )
  const adjustedSourcePoint = adjusted.sourcePoint
  const adjustedTargetPoint = adjusted.targetPoint

  // Keep user-defined routes and only re-anchor the endpoints.
  if (explicitPoints.length >= 2) {
    return deduplicateConsecutivePoints([
      adjustedSourcePoint,
      ...explicitPoints.slice(1, -1),
      adjustedTargetPoint,
    ])
  }

  const runtimeFallbackPoints = buildRuntimeLikeClassEdgePoints(
    edge,
    sourceLayout,
    sourceHandle.side,
    sourceHandle.point,
    targetLayout,
    targetHandle.side,
    targetHandle.point
  )
  if (runtimeFallbackPoints.length >= 2) {
    return runtimeFallbackPoints
  }

  // Final fallback if path reconstruction fails.
  return buildOrthogonalStepPoints(
    adjustedSourcePoint,
    sourceHandle.side,
    adjustedTargetPoint,
    targetHandle.side
  )
}

const getNodeColors = (data: Record<string, unknown>) => ({
  fillColor: resolveColor(data.fillColor, FILL_COLOR),
  strokeColor: resolveColor(data.strokeColor, STROKE_COLOR),
  textColor: resolveColor(data.textColor, STROKE_COLOR),
})

const appendText = (
  parent: Element,
  text: string,
  attrs: Record<string, string | number>
): SVGTextElement => {
  const textElement = createSvgElement("text")
  setAttr(textElement, attrs)
  textElement.textContent = text
  parent.appendChild(textElement)
  return textElement
}

const appendHorizontalSeparator = (
  parent: Element,
  x: number,
  y: number,
  width: number,
  color: string,
  thickness: number = LAYOUT.LINE_WIDTH
): void => {
  const separator = createSvgElement("rect")
  setAttr(separator, {
    x,
    y: y - thickness / 2,
    width,
    height: thickness,
    fill: color,
  })
  parent.appendChild(separator)
}

const renderClassNode = (
  parent: Element,
  layout: NodeLayout,
  fontFamily: string,
  fontSize: number,
  bounds: Bounds
): void => {
  const nodeData = (layout.node.data ?? {}) as ClassNodeProps
  const data = (layout.node.data ?? {}) as Record<string, unknown>
  const { fillColor, strokeColor, textColor } = getNodeColors(data)

  const name = asText(nodeData.name) ?? "Class"
  const stereotype = asText(nodeData.stereotype)
  const showStereotype = !!stereotype
  const headerHeight = showStereotype
    ? LAYOUT.DEFAULT_HEADER_HEIGHT_WITH_STEREOTYPE
    : LAYOUT.DEFAULT_HEADER_HEIGHT
  const attributeHeight = LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT
  const methodHeight = LAYOUT.DEFAULT_METHOD_HEIGHT
  const padding = LAYOUT.DEFAULT_PADDING

  const attributes = Array.isArray(nodeData.attributes)
    ? (nodeData.attributes as ClassNodeElement[])
    : []
  const methods = Array.isArray(nodeData.methods)
    ? (nodeData.methods as ClassNodeElement[])
    : []

  const frame = createSvgElement("rect")
  setAttr(frame, {
    x: layout.x,
    y: layout.y,
    width: layout.width,
    height: layout.height,
    fill: fillColor,
  })
  parent.appendChild(frame)

  const headerFill = createSvgElement("rect")
  setAttr(headerFill, {
    x: layout.x + LAYOUT.LINE_WIDTH / 2,
    y: layout.y + LAYOUT.LINE_WIDTH / 2,
    width: layout.width - LAYOUT.LINE_WIDTH,
    height: headerHeight - LAYOUT.LINE_WIDTH / 2,
    fill: fillColor,
  })
  parent.appendChild(headerFill)

  if (showStereotype && stereotype) {
    const stereotypeY = layout.y + headerHeight / 2 - 8
    appendText(parent, `\u00AB${stereotype}\u00BB`, {
      x: layout.x + layout.width / 2,
      y: stereotypeY,
      "font-size": fontSize * 0.85,
      "font-family": fontFamily,
      "font-weight": "700",
      "text-anchor": "middle",
      fill: textColor,
    })
    expandBoundsWithText(
      bounds,
      stereotype,
      layout.x + layout.width / 2,
      stereotypeY,
      "middle",
      fontSize * 0.85
    )

    const isAbstract = stereotype === ClassType.Abstract
    const classNameY = layout.y + headerHeight / 2 + 10
    appendText(parent, name, {
      x: layout.x + layout.width / 2,
      y: classNameY,
      "font-size": fontSize,
      "font-family": fontFamily,
      "font-weight": "700",
      "font-style": isAbstract ? "italic" : "normal",
      "text-anchor": "middle",
      fill: textColor,
    })
    expandBoundsWithText(
      bounds,
      name,
      layout.x + layout.width / 2,
      classNameY,
      "middle",
      fontSize
    )
  } else {
    const classNameY = layout.y + headerHeight / 2 + 6
    appendText(parent, name, {
      x: layout.x + layout.width / 2,
      y: classNameY,
      "font-size": fontSize,
      "font-family": fontFamily,
      "font-weight": "700",
      "text-anchor": "middle",
      fill: textColor,
    })
    expandBoundsWithText(
      bounds,
      name,
      layout.x + layout.width / 2,
      classNameY,
      "middle",
      fontSize
    )
  }

  attributes.forEach((attribute, index) => {
    const rowY = layout.y + headerHeight + index * attributeHeight
    const rowFill = resolveColor(attribute.fillColor, fillColor)
    const rowText = resolveColor(attribute.textColor, textColor)

    const rowRect = createSvgElement("rect")
    setAttr(rowRect, {
      x: layout.x + LAYOUT.LINE_WIDTH / 2,
      y: rowY + LAYOUT.LINE_WIDTH / 2,
      width: layout.width - LAYOUT.LINE_WIDTH,
      height: attributeHeight - LAYOUT.LINE_WIDTH,
      fill: rowFill,
    })
    parent.appendChild(rowRect)

    const rowTextY = rowY + 20
    appendText(parent, asText(attribute.name) ?? "", {
      x: layout.x + padding,
      y: rowTextY,
      "font-size": fontSize,
      "font-family": fontFamily,
      "text-anchor": "start",
      fill: rowText,
    })
    expandBoundsWithText(
      bounds,
      asText(attribute.name) ?? "",
      layout.x + padding,
      rowTextY,
      "start",
      fontSize
    )
  })

  methods.forEach((method, index) => {
    const rowY =
      layout.y +
      headerHeight +
      attributes.length * attributeHeight +
      index * methodHeight
    const rowFill = resolveColor(method.fillColor, fillColor)
    const rowText = resolveColor(method.textColor, textColor)
    const rowRect = createSvgElement("rect")
    setAttr(rowRect, {
      x: layout.x + LAYOUT.LINE_WIDTH / 2,
      y: rowY + LAYOUT.LINE_WIDTH / 2,
      width: layout.width - LAYOUT.LINE_WIDTH,
      height: methodHeight - LAYOUT.LINE_WIDTH,
      fill: rowFill,
    })
    parent.appendChild(rowRect)

    const rowTextY = rowY + 20
    appendText(parent, asText(method.name) ?? "", {
      x: layout.x + padding,
      y: rowTextY,
      "font-size": fontSize,
      "font-family": fontFamily,
      "text-anchor": "start",
      fill: rowText,
    })
    expandBoundsWithText(
      bounds,
      asText(method.name) ?? "",
      layout.x + padding,
      rowTextY,
      "start",
      fontSize
    )
  })

  if (attributes.length > 0) {
    appendHorizontalSeparator(
      parent,
      layout.x,
      layout.y + headerHeight,
      layout.width,
      strokeColor
    )
  }

  if (methods.length > 0) {
    appendHorizontalSeparator(
      parent,
      layout.x,
      layout.y + headerHeight + attributes.length * attributeHeight,
      layout.width,
      strokeColor
    )
  }

  // Draw the outer border last so PowerPoint conversion does not hide side lines.
  const frameOutline = createSvgElement("rect")
  setAttr(frameOutline, {
    x: layout.x,
    y: layout.y,
    width: layout.width,
    height: layout.height,
    stroke: strokeColor,
    "stroke-width": LAYOUT.LINE_WIDTH,
    fill: "none",
  })
  parent.appendChild(frameOutline)
}

const renderPackageNode = (
  parent: Element,
  layout: NodeLayout,
  fontFamily: string,
  fontSize: number,
  bounds: Bounds
): void => {
  const data = (layout.node.data ?? {}) as DefaultNodeProps &
    Record<string, unknown>
  const { fillColor, strokeColor, textColor } = getNodeColors(data)
  const name = asText(data.name) ?? "Package"

  const tabRect = createSvgElement("rect")
  setAttr(tabRect, {
    x: layout.x,
    y: layout.y,
    width: Math.min(40, layout.width),
    height: Math.min(PACKAGE_TAB_HEIGHT, layout.height),
    stroke: strokeColor,
    "stroke-width": LAYOUT.LINE_WIDTH,
    fill: fillColor,
  })
  parent.appendChild(tabRect)

  const bodyRect = createSvgElement("rect")
  setAttr(bodyRect, {
    x: layout.x,
    y: layout.y + PACKAGE_TAB_HEIGHT,
    width: layout.width,
    height: Math.max(1, layout.height - PACKAGE_TAB_HEIGHT),
    stroke: strokeColor,
    "stroke-width": LAYOUT.LINE_WIDTH,
    fill: fillColor,
  })
  parent.appendChild(bodyRect)

  const textY = layout.y + PACKAGE_TAB_HEIGHT + 16
  appendText(parent, name, {
    x: layout.x + layout.width / 2,
    y: textY,
    "font-size": fontSize,
    "font-family": fontFamily,
    "font-weight": "600",
    "text-anchor": "middle",
    fill: textColor,
  })
  expandBoundsWithText(
    bounds,
    name,
    layout.x + layout.width / 2,
    textY,
    "middle",
    fontSize
  )
}

const wrapTextApprox = (
  text: string,
  maxWidth: number,
  fontSize: number
): string[] => {
  if (!text) return []
  const words = text.split(/\s+/).filter((word) => word.length > 0)
  if (words.length === 0) return []

  const lines: string[] = []
  let current = ""

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word
    if (estimateTextWidth(candidate, fontSize) <= maxWidth) {
      current = candidate
      return
    }
    if (current) {
      lines.push(current)
      current = word
      return
    }
    lines.push(word)
    current = ""
  })

  if (current) {
    lines.push(current)
  }

  return lines
}

const renderColorDescriptionNode = (
  parent: Element,
  layout: NodeLayout,
  fontFamily: string,
  fontSize: number,
  bounds: Bounds
): void => {
  const data = (layout.node.data ?? {}) as DefaultNodeProps &
    Record<string, unknown>
  const { fillColor, strokeColor, textColor } = getNodeColors(data)
  const name =
    asText(data.name) ?? asText(data.description) ?? "Color Description"
  const fold = Math.min(15, Math.max(8, layout.width * 0.12))

  const mainPath = createSvgElement("path")
  setAttr(mainPath, {
    d: `M ${formatNumber(layout.x)} ${formatNumber(layout.y)} L ${formatNumber(layout.x + layout.width - fold)} ${formatNumber(layout.y)} L ${formatNumber(layout.x + layout.width - fold)} ${formatNumber(layout.y + fold)} L ${formatNumber(layout.x + layout.width)} ${formatNumber(layout.y + fold)} L ${formatNumber(layout.x + layout.width)} ${formatNumber(layout.y + layout.height)} L ${formatNumber(layout.x)} ${formatNumber(layout.y + layout.height)} Z`,
    stroke: strokeColor,
    "stroke-width": LAYOUT.LINE_WIDTH,
    fill: fillColor,
  })
  parent.appendChild(mainPath)

  const foldPath = createSvgElement("path")
  setAttr(foldPath, {
    d: `M ${formatNumber(layout.x + layout.width - fold)} ${formatNumber(layout.y)} L ${formatNumber(layout.x + layout.width - fold)} ${formatNumber(layout.y + fold)} L ${formatNumber(layout.x + layout.width)} ${formatNumber(layout.y + fold)} Z`,
    stroke: strokeColor,
    "stroke-width": LAYOUT.LINE_WIDTH,
    fill: fillColor,
  })
  parent.appendChild(foldPath)

  const textY = layout.y + layout.height / 2 + fontSize * 0.35
  appendText(parent, name, {
    x: layout.x + layout.width / 2,
    y: textY,
    "font-size": fontSize,
    "font-family": fontFamily,
    "font-weight": "600",
    "text-anchor": "middle",
    fill: textColor,
  })
  expandBoundsWithText(
    bounds,
    name,
    layout.x + layout.width / 2,
    textY,
    "middle",
    fontSize
  )
}

const renderTitleAndDescriptionNode = (
  parent: Element,
  layout: NodeLayout,
  fontFamily: string,
  fontSize: number,
  bounds: Bounds
): void => {
  const data = (layout.node.data ?? {}) as Record<string, unknown>
  const { fillColor, strokeColor, textColor } = getNodeColors(data)
  const title = asText(data.title) ?? "Title"
  const description = asText(data.description) ?? ""

  const padding = 10
  const titleHeight = 30
  const separatorHeight = LAYOUT.LINE_WIDTH
  const lineHeight = 18
  const titleFontSize = Math.max(14, fontSize)
  const descriptionFontSize = Math.max(12, fontSize - 2)

  const outer = createSvgElement("rect")
  setAttr(outer, {
    x: layout.x + padding / 2,
    y: layout.y + padding / 2,
    width: Math.max(1, layout.width - padding),
    height: Math.max(1, layout.height - padding),
    stroke: strokeColor,
    "stroke-width": LAYOUT.LINE_WIDTH,
    fill: fillColor,
  })
  parent.appendChild(outer)

  const titleY = layout.y + padding + titleHeight / 2 + 5
  appendText(parent, title, {
    x: layout.x + layout.width / 2,
    y: titleY,
    "font-size": titleFontSize,
    "font-family": fontFamily,
    "font-weight": "700",
    "text-anchor": "middle",
    fill: textColor,
  })
  expandBoundsWithText(
    bounds,
    title,
    layout.x + layout.width / 2,
    titleY,
    "middle",
    titleFontSize
  )

  const separatorY = layout.y + padding + titleHeight
  const separator = createSvgElement("line")
  setAttr(separator, {
    x1: layout.x + padding / 2,
    x2: layout.x + layout.width - padding / 2,
    y1: separatorY,
    y2: separatorY,
    stroke: strokeColor,
    "stroke-width": LAYOUT.LINE_WIDTH,
  })
  parent.appendChild(separator)

  const descriptionStartY =
    layout.y + padding + titleHeight + separatorHeight + 10
  const maxDescriptionHeight =
    layout.height - (descriptionStartY - layout.y) - padding
  const maxTextWidth = Math.max(20, layout.width - 2 * padding)
  const wrapped = wrapTextApprox(description, maxTextWidth, descriptionFontSize)
  const maxLines = Math.max(0, Math.floor(maxDescriptionHeight / lineHeight))
  const descriptionLines =
    wrapped.length > maxLines && maxLines > 0
      ? [...wrapped.slice(0, maxLines - 1), `${wrapped[maxLines - 1]} ...`]
      : wrapped.slice(0, maxLines || wrapped.length)

  descriptionLines.forEach((line, index) => {
    const y = descriptionStartY + index * lineHeight
    appendText(parent, line, {
      x: layout.x + padding,
      y,
      "font-size": descriptionFontSize,
      "font-family": fontFamily,
      "text-anchor": "start",
      fill: textColor,
    })
    expandBoundsWithText(
      bounds,
      line,
      layout.x + padding,
      y,
      "start",
      descriptionFontSize
    )
  })
}

const renderFallbackNode = (
  parent: Element,
  layout: NodeLayout,
  fontFamily: string,
  fontSize: number,
  bounds: Bounds
): void => {
  const data = (layout.node.data ?? {}) as Record<string, unknown>
  const { fillColor, strokeColor, textColor } = getNodeColors(data)
  const name = asText(data.name) ?? layout.node.type

  const rect = createSvgElement("rect")
  setAttr(rect, {
    x: layout.x,
    y: layout.y,
    width: layout.width,
    height: layout.height,
    stroke: strokeColor,
    "stroke-width": LAYOUT.LINE_WIDTH,
    fill: fillColor,
  })
  parent.appendChild(rect)

  const textY = layout.y + Math.min(24, layout.height / 2 + 5)
  appendText(parent, name, {
    x: layout.x + layout.width / 2,
    y: textY,
    "font-size": fontSize,
    "font-family": fontFamily,
    "text-anchor": "middle",
    fill: textColor,
  })
  expandBoundsWithText(
    bounds,
    name,
    layout.x + layout.width / 2,
    textY,
    "middle",
    fontSize
  )
}

const toEdgeLayout = (
  edge: ApollonEdge,
  nodeLayouts: Map<string, NodeLayout>
): EdgeLayout | null => {
  const points = buildEdgePoints(edge, nodeLayouts)
  if (points.length < 2) return null
  const edgeData = (edge.data ?? {}) as Record<string, unknown>
  return {
    edge,
    points,
    strokeColor: resolveColor(edgeData.strokeColor, STROKE_COLOR),
    textColor: resolveColor(edgeData.textColor, STROKE_COLOR),
    markerId: resolveEdgeMarkerId(edge.type),
    dashed: isDashedClassEdge(edge.type),
    labels: {
      sourceRole: asText(edgeData.sourceRole),
      sourceMultiplicity: asText(edgeData.sourceMultiplicity),
      targetRole: asText(edgeData.targetRole),
      targetMultiplicity: asText(edgeData.targetMultiplicity),
    },
  }
}

const renderEdge = (
  parent: Element,
  edgeLayout: EdgeLayout,
  fontFamily: string,
  fontSize: number,
  bounds: Bounds
): void => {
  edgeLayout.points.forEach((point) => expandBoundsWithPoint(bounds, point))

  const pathData = toAbsolutePath(edgeLayout.points)
  if (!pathData) return

  const pathElement = createSvgElement("path")
  setAttr(pathElement, {
    d: pathData,
    stroke: edgeLayout.strokeColor,
    "stroke-width": LAYOUT.LINE_WIDTH_EDGE,
    fill: "none",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  })
  if (edgeLayout.dashed) {
    pathElement.setAttribute("stroke-dasharray", "10")
  }
  parent.appendChild(pathElement)

  const marker = renderMarker(
    edgeLayout.markerId,
    edgeLayout.points[edgeLayout.points.length - 1],
    getLastSegmentDirection(edgeLayout.points),
    edgeLayout.strokeColor
  )
  if (marker.element) {
    parent.appendChild(marker.element)
    marker.markerBounds.forEach((point) => expandBoundsWithPoint(bounds, point))
  }

  if (edgeLayout.points.length >= 2) {
    const sourcePoint = edgeLayout.points[0]
    const secondPoint = edgeLayout.points[1]
    const targetPoint = edgeLayout.points[edgeLayout.points.length - 1]
    const beforeTarget = edgeLayout.points[edgeLayout.points.length - 2]

    const sourceLabelPlacement = calculateDynamicEdgeLabels(
      sourcePoint.x,
      sourcePoint.y,
      toDirection(sourcePoint, secondPoint)
    )
    const targetLabelPlacement = calculateDynamicEdgeLabels(
      targetPoint.x,
      targetPoint.y,
      toDirection(beforeTarget, targetPoint)
    )

    if (edgeLayout.labels.sourceRole) {
      appendText(parent, edgeLayout.labels.sourceRole, {
        x: sourceLabelPlacement.roleX,
        y: sourceLabelPlacement.roleY,
        "font-size": fontSize,
        "font-family": fontFamily,
        "text-anchor": sourceLabelPlacement.roleTextAnchor,
        fill: edgeLayout.textColor,
      })
      expandBoundsWithText(
        bounds,
        edgeLayout.labels.sourceRole,
        sourceLabelPlacement.roleX,
        sourceLabelPlacement.roleY,
        sourceLabelPlacement.roleTextAnchor,
        fontSize
      )
    }

    if (edgeLayout.labels.sourceMultiplicity) {
      appendText(parent, edgeLayout.labels.sourceMultiplicity, {
        x: sourceLabelPlacement.multiplicityX,
        y: sourceLabelPlacement.multiplicityY,
        "font-size": fontSize,
        "font-family": fontFamily,
        "text-anchor": sourceLabelPlacement.multiplicityTextAnchor,
        fill: edgeLayout.textColor,
      })
      expandBoundsWithText(
        bounds,
        edgeLayout.labels.sourceMultiplicity,
        sourceLabelPlacement.multiplicityX,
        sourceLabelPlacement.multiplicityY,
        sourceLabelPlacement.multiplicityTextAnchor,
        fontSize
      )
    }

    if (edgeLayout.labels.targetRole) {
      appendText(parent, edgeLayout.labels.targetRole, {
        x: targetLabelPlacement.roleX,
        y: targetLabelPlacement.roleY,
        "font-size": fontSize,
        "font-family": fontFamily,
        "text-anchor": targetLabelPlacement.roleTextAnchor,
        fill: edgeLayout.textColor,
      })
      expandBoundsWithText(
        bounds,
        edgeLayout.labels.targetRole,
        targetLabelPlacement.roleX,
        targetLabelPlacement.roleY,
        targetLabelPlacement.roleTextAnchor,
        fontSize
      )
    }

    if (edgeLayout.labels.targetMultiplicity) {
      appendText(parent, edgeLayout.labels.targetMultiplicity, {
        x: targetLabelPlacement.multiplicityX,
        y: targetLabelPlacement.multiplicityY,
        "font-size": fontSize,
        "font-family": fontFamily,
        "text-anchor": targetLabelPlacement.multiplicityTextAnchor,
        fill: edgeLayout.textColor,
      })
      expandBoundsWithText(
        bounds,
        edgeLayout.labels.targetMultiplicity,
        targetLabelPlacement.multiplicityX,
        targetLabelPlacement.multiplicityY,
        targetLabelPlacement.multiplicityTextAnchor,
        fontSize
      )
    }
  }
}

export const exportClassDiagramAsFlatSvg = (
  model: UMLModel,
  options: FlatSvgExportOptions = {}
): SVG => {
  if (typeof document === "undefined") {
    throw new Error("flat SVG export requires a browser DOM environment")
  }

  if (model.type !== UMLDiagramType.ClassDiagram) {
    throw new Error(
      `flat class SVG export supports only ClassDiagram models, got ${model.type}`
    )
  }

  const margin = Math.max(0, options.margin ?? DEFAULT_MARGIN)
  const fontSize = Math.max(8, options.fontSize ?? DEFAULT_FONT_SIZE)
  const fontFamily = options.fontFamily ?? DEFAULT_FONT_FAMILY
  const background = options.background ?? "white"

  const nodeLayouts = buildNodeLayouts(model)
  const sortedNodes = [...nodeLayouts.values()].sort((left, right) =>
    left.node.id.localeCompare(right.node.id)
  )
  const sortedEdges = [...model.edges]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((edge) => toEdgeLayout(edge, nodeLayouts))
    .filter((edge): edge is EdgeLayout => edge != null)

  const bounds = ensureBounds()
  sortedNodes.forEach((layout) => {
    expandBoundsWithRect(
      bounds,
      layout.x,
      layout.y,
      layout.width,
      layout.height
    )
  })
  sortedEdges.forEach((edge) => {
    edge.points.forEach((point) => expandBoundsWithPoint(bounds, point))
  })

  if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minY)) {
    bounds.minX = 0
    bounds.minY = 0
    bounds.maxX = 1
    bounds.maxY = 1
  }

  const root = createSvgElement("svg")
  setAttr(root, {
    xmlns: SVG_NS,
  })

  if (background === "white") {
    const bg = createSvgElement("rect")
    setAttr(bg, {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      fill: "#ffffff",
    })
    root.appendChild(bg)
  }

  sortedEdges.forEach((edgeLayout) =>
    renderEdge(root, edgeLayout, fontFamily, fontSize, bounds)
  )

  sortedNodes.forEach((layout) => {
    if (layout.node.type === "class") {
      renderClassNode(root, layout, fontFamily, fontSize, bounds)
      return
    }
    if (layout.node.type === "package") {
      renderPackageNode(root, layout, fontFamily, fontSize, bounds)
      return
    }
    if (layout.node.type === "colorDescription") {
      renderColorDescriptionNode(root, layout, fontFamily, fontSize, bounds)
      return
    }
    if (layout.node.type === "titleAndDesctiption") {
      renderTitleAndDescriptionNode(root, layout, fontFamily, fontSize, bounds)
      return
    }
    renderFallbackNode(root, layout, fontFamily, fontSize, bounds)
  })

  const clip = {
    x: bounds.minX - margin,
    y: bounds.minY - margin,
    width: Math.max(1, bounds.maxX - bounds.minX + margin * 2),
    height: Math.max(1, bounds.maxY - bounds.minY + margin * 2),
  }

  setAttr(root, {
    width: clip.width,
    height: clip.height,
    viewBox: `${formatNumber(clip.x)} ${formatNumber(clip.y)} ${formatNumber(clip.width)} ${formatNumber(clip.height)}`,
  })

  const bgRect = root.querySelector("rect")
  if (background === "white" && bgRect) {
    setAttr(bgRect, {
      x: clip.x,
      y: clip.y,
      width: clip.width,
      height: clip.height,
    })
  }

  return {
    svg: root.outerHTML,
    clip,
  }
}
