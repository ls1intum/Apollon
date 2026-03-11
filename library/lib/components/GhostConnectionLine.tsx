import {
  ConnectionLineComponentProps,
  getSmoothStepPath,
  ConnectionLineType,
} from "@xyflow/react"

/**
 * Custom connection line component that renders a "ghost edge" style
 * (dashed, semi-transparent) when dragging from a node handle.
 *
 * This ensures consistent visual feedback regardless of whether the user
 * drags from a node handle or from an edge endpoint.
 */
export function GhostConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
  connectionLineType,
}: ConnectionLineComponentProps) {
  let path: string

  if (
    connectionLineType === ConnectionLineType.Straight ||
    connectionLineType === ConnectionLineType.SimpleBezier
  ) {
    path = `M ${fromX},${fromY} L ${toX},${toY}`
  } else {
    // Step/SmoothStep path (default for most diagram types)
    const [edgePath] = getSmoothStepPath({
      sourceX: fromX,
      sourceY: fromY,
      sourcePosition: fromPosition,
      targetX: toX,
      targetY: toY,
      targetPosition: toPosition,
      borderRadius: 0,
      offset: 30,
    })
    path = edgePath
  }

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke="var(--xy-edge-stroke, #000)"
        strokeWidth={2}
        strokeDasharray="6 4"
        strokeOpacity={0.5}
        className="ghost-connection-line"
      />
    </g>
  )
}
