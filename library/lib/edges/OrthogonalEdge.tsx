import React, { memo, useCallback, useMemo, useRef, useState } from "react"
import { useReactFlow } from "@xyflow/react"
import { useShallow } from "zustand/shallow"
import { Segment, SegmentOrientation } from "./Segment"
import { CommonEdgeElements } from "./GenericEdge"
import { EdgeEndLabels } from "./labelTypes/EdgeEndLabels"
import { ExtendedEdgeProps } from "./EdgeProps"
import { AssessmentSelectableWrapper } from "@/components"
import { FeedbackDropzone } from "@/components/wrapper/FeedbackDropzone"
import { OrthogonalEdgeData, DiagramEdgeType } from "@/typings"
import {
  useEdgeInteractions,
  type EdgeDragCommit,
} from "./interactions/useEdgeInteractions"
import { useOrthogonalRoute } from "./interactions/useOrthogonalRoute"
import { useDiagramStore, usePopoverStore } from "@/store"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { useReconnect, useToolbar } from "@/hooks"
import { getCustomColorsFromDataForEdge } from "@/utils"
import { orthogonalEdgePropsAreEqual } from "@/store/memoization"
import { IPoint } from "./types"
import type { DiagramStore } from "@/store/diagramStore"
import type { PopoverStore } from "@/store/popoverStore"

export type OrthogonalEdgeProps = Omit<ExtendedEdgeProps, "data"> & {
  data: OrthogonalEdgeData
}

const ENDPOINT_HANDLE_RADIUS = 6

function midpointOfPath(points: IPoint[]): IPoint {
  if (points.length < 2) return points[0] ?? { x: 0, y: 0 }
  let total = 0
  for (let i = 0; i < points.length - 1; i++) {
    total +=
      Math.abs(points[i + 1].x - points[i].x) +
      Math.abs(points[i + 1].y - points[i].y)
  }
  const half = total / 2
  let walked = 0
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const segLen = Math.abs(b.x - a.x) + Math.abs(b.y - a.y)
    if (walked + segLen >= half) {
      const remaining = half - walked
      const ratio = segLen === 0 ? 0 : remaining / segLen
      return {
        x: a.x + (b.x - a.x) * ratio,
        y: a.y + (b.y - a.y) * ratio,
      }
    }
    walked += segLen
  }
  return points[points.length - 1]
}

function getFallbackPoints(data: OrthogonalEdgeData): {
  pointsList: IPoint[][]
} {
  if (Array.isArray(data?.points) && data.points.length >= 2) {
    return { pointsList: [data.points] }
  }

  return { pointsList: [[]] }
}

function stripComputedSegments(
  data: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!data) return {}

  const persistedData = { ...data }
  delete persistedData.computedSegments
  return persistedData
}

const OrthogonalEdgeInner: React.FC<OrthogonalEdgeProps> = ({
  id,
  type,
  source,
  target,
  sourceHandleId,
  targetHandleId,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
  style,
  markerEnd,
  markerStart,
}) => {
  const anchorRef = useRef<SVGSVGElement | null>(null)
  const { handleDelete } = useToolbar({ id })
  const onReconnect = useReconnect()
  const { getEdges } = useReactFlow()
  const isDiagramModifiable = useDiagramModifiable()
  const assessments = useDiagramStore(
    useShallow((s: DiagramStore) => s.assessments)
  )
  const setEdges = useDiagramStore((s) => s.setEdges)
  const setPopOverElementId = usePopoverStore(
    useShallow((s: PopoverStore) => s.setPopOverElementId)
  )

  const { pointsList } = getFallbackPoints(data)
  const [committedRoute, setCommittedRoute] = useState<IPoint[] | undefined>()
  const localRoute = useOrthogonalRoute({
    edgeId: id,
    sourceNodeId: source,
    targetNodeId: target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    currentRoute: committedRoute,
    userWaypoints: data?.userWaypoints,
    routingMode: data?.routingMode,
  })

  const primaryPoints = localRoute ?? committedRoute ?? pointsList[0] ?? []

  const onCommit = useCallback(
    (commit: EdgeDragCommit | null) => {
      if (!commit) return
      setCommittedRoute(commit.finalPath)

      if (commit.drag.kind === "midpoint") {
        const userWaypoints = commit.drag.userWaypoints
        setEdges((edges) =>
          edges.map((edge) =>
            edge.id === id
              ? {
                  ...edge,
                  data: {
                    ...stripComputedSegments(edge.data),
                    userWaypoints,
                    routingMode: "manual",
                  },
                }
              : edge
          )
        )
        return
      }

      const oldEdge = getEdges().find((edge) => edge.id === id)
      const handle = commit.drag.handle
      if (!oldEdge || !handle) return

      const nextData = {
        ...stripComputedSegments(oldEdge.data),
        userWaypoints: [],
        routingMode: "auto",
      }

      if (commit.drag.kind === "source") {
        onReconnect(
          oldEdge,
          {
            source: handle.nodeId,
            target: oldEdge.target,
            sourceHandle: handle.handleId,
            targetHandle: oldEdge.targetHandle ?? null,
          },
          nextData
        )
        return
      }

      onReconnect(
        oldEdge,
        {
          source: oldEdge.source,
          target: handle.nodeId,
          sourceHandle: oldEdge.sourceHandle ?? null,
          targetHandle: handle.handleId,
        },
        nextData
      )
    },
    [getEdges, id, onReconnect, setEdges]
  )

  const { onSegmentPointerDown, onHandlePointerDown, activeWaypoints } =
    useEdgeInteractions(id, primaryPoints, {
      sourceNodeId: source,
      targetNodeId: target,
      sourceHandleId,
      targetHandleId,
      onCommit,
    })

  const displayPoints = activeWaypoints ?? primaryPoints
  const pathMiddlePosition = useMemo(
    () => midpointOfPath(displayPoints),
    [displayPoints]
  )

  const { strokeColor, textColor } = getCustomColorsFromDataForEdge(
    data as { strokeColor?: string; textColor?: string } | undefined
  )

  if (displayPoints.length < 2) return null

  const allSegments = pointsList.map((points, pathIndex) => {
    const renderPoints = pathIndex === 0 ? displayPoints : points
    if (renderPoints.length < 2) return null

    const segments = []
    for (let i = 0; i < renderPoints.length - 1; i++) {
      const start = renderPoints[i]
      const end = renderPoints[i + 1]
      const orientation: SegmentOrientation = start.y === end.y ? "H" : "V"

      segments.push(
        <Segment
          key={`${id}-path${pathIndex}-seg${i}`}
          start={start}
          end={end}
          orientation={orientation}
          stroke={(style?.stroke as string) || strokeColor}
          strokeWidth={(style?.strokeWidth as number) || 1}
          strokeDasharray={style?.strokeDasharray as string}
          markerStart={i === 0 ? markerStart : undefined}
          markerEnd={i === renderPoints.length - 2 ? markerEnd : undefined}
          interactive={isDiagramModifiable}
          onPointerDown={
            isDiagramModifiable ? (e) => onSegmentPointerDown(e, i) : undefined
          }
        />
      )
    }
    return (
      <g key={`${id}-path${pathIndex}`} className="orthogonal-path-group">
        {segments}
      </g>
    )
  })

  const sourcePoint = displayPoints[0]
  const targetPoint = displayPoints[displayPoints.length - 1]

  return (
    <AssessmentSelectableWrapper elementId={id} asElement="g">
      <FeedbackDropzone elementId={id} asElement="g" elementType={type}>
        <g className="orthogonal-edge">
          {allSegments}
          {selected && isDiagramModifiable && (
            <>
              <circle
                className="orthogonal-edge-endpoint orthogonal-edge-endpoint--source"
                cx={sourcePoint.x}
                cy={sourcePoint.y}
                r={ENDPOINT_HANDLE_RADIUS}
                fill="white"
                stroke="black"
                strokeWidth={1}
                cursor="grab"
                onPointerDown={(e) => onHandlePointerDown(e, true)}
              />
              <circle
                className="orthogonal-edge-endpoint orthogonal-edge-endpoint--target"
                cx={targetPoint.x}
                cy={targetPoint.y}
                r={ENDPOINT_HANDLE_RADIUS}
                fill="white"
                stroke="black"
                strokeWidth={1}
                cursor="grab"
                onPointerDown={(e) => onHandlePointerDown(e, false)}
              />
            </>
          )}
        </g>

        <EdgeEndLabels
          data={data as unknown as Parameters<typeof EdgeEndLabels>[0]["data"]}
          activePoints={displayPoints}
          sourceX={sourceX}
          sourceY={sourceY}
          targetX={targetX}
          targetY={targetY}
          sourcePosition={sourcePosition as unknown as string}
          targetPosition={targetPosition as unknown as string}
          textColor={textColor}
        />

        <CommonEdgeElements
          id={id}
          pathMiddlePosition={pathMiddlePosition}
          isDiagramModifiable={isDiagramModifiable}
          assessments={assessments}
          anchorRef={anchorRef}
          handleDelete={handleDelete}
          setPopOverElementId={setPopOverElementId}
          type={type as DiagramEdgeType}
        />
      </FeedbackDropzone>
    </AssessmentSelectableWrapper>
  )
}

export const OrthogonalEdge = memo(
  OrthogonalEdgeInner,
  orthogonalEdgePropsAreEqual
)
