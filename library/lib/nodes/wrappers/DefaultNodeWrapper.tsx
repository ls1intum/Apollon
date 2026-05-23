import { AssessmentSelectableWrapper } from "@/components/wrapper/AssessmentSelectableWrapper"
import { FeedbackDropzone } from "@/components/wrapper/FeedbackDropzone"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { useMetadataStore } from "@/store/context"
import { getDistributedHandleOffsetPercents } from "@/utils"
import { Handle, Position, useReactFlow } from "@xyflow/react"
import { useMemo } from "react"
import { useShallow } from "zustand/shallow"

// Define enum for handle IDs
export enum HandleId {
  TopLeft = "top-left",
  TopMidLeft = "top-mid-left",
  Top = "top",
  TopMidRight = "top-mid-right",
  TopRight = "top-right",
  RightTop = "right-top",
  RightMidTop = "right-mid-top",
  Right = "right",
  RightMidBottom = "right-mid-bottom",
  RightBottom = "right-bottom",
  BottomRight = "bottom-right",
  BottomMidRight = "bottom-mid-right",
  Bottom = "bottom",
  BottomMidLeft = "bottom-mid-left",
  BottomLeft = "bottom-left",
  LeftBottom = "left-bottom",
  LeftMidBottom = "left-mid-bottom",
  Left = "left",
  LeftMidTop = "left-mid-top",
  LeftTop = "left-top",
}

// Preset for hiding corner and intermediate handles, showing only main directional handles
export const FOUR_WAY_HANDLES_PRESET: HandleId[] = [
  HandleId.TopLeft,
  HandleId.TopMidLeft,
  HandleId.TopMidRight,
  HandleId.TopRight,
  HandleId.RightTop,
  HandleId.RightMidTop,
  HandleId.RightMidBottom,
  HandleId.RightBottom,
  HandleId.BottomRight,
  HandleId.BottomMidRight,
  HandleId.BottomMidLeft,
  HandleId.BottomLeft,
  HandleId.LeftBottom,
  HandleId.LeftMidBottom,
  HandleId.LeftMidTop,
  HandleId.LeftTop,
]

interface Props {
  children: React.ReactNode
  width?: number
  height?: number
  elementId: string
  hiddenHandles?: HandleId[] | true
  className?: string
}

export function DefaultNodeWrapper({
  elementId,
  children,
  hiddenHandles = [],
  className,
}: Props) {
  const { getNode } = useReactFlow()
  const node = getNode(elementId)
  const nodeType = node?.type
  const nodeWidth = node?.width ?? 0
  const nodeHeight = node?.height ?? 0
  const isDiagramModifiable = useDiagramModifiable()
  const {
    connectionGuidanceActive,
    connectionGuidanceSourceNodeId,
    connectionGuidanceSourceHandleId,
    connectionGuidanceTargetNodeId,
    connectionGuidanceTargetHandleId,
  } = useMetadataStore(
    useShallow((state) => ({
      connectionGuidanceActive: state.connectionGuidanceActive,
      connectionGuidanceSourceNodeId: state.connectionGuidanceSourceNodeId,
      connectionGuidanceSourceHandleId: state.connectionGuidanceSourceHandleId,
      connectionGuidanceTargetNodeId: state.connectionGuidanceTargetNodeId,
      connectionGuidanceTargetHandleId: state.connectionGuidanceTargetHandleId,
    }))
  )

  const baseHandleStyle = {
    width: 8,
    height: 8,
    position: "absolute" as const,
    backgroundColor: "transparent",
    border: "none",
    zIndex: 10,
    transition: "opacity 120ms ease",
    overflow: "visible",
    boxSizing: "border-box" as const,
  }

  // Keep all handle ids available for compatibility with existing edges,
  // but only 3 handles per side are visible.
  const [leftStart, leftMidStart, leftMiddle, leftMidEnd, leftEnd] = useMemo(
    () => getDistributedHandleOffsetPercents(nodeWidth),
    [nodeWidth]
  )

  const [topStart, topMidStart, topMiddle, topMidEnd, topEnd] = useMemo(
    () => getDistributedHandleOffsetPercents(nodeHeight),
    [nodeHeight]
  )

  const handles = [
    {
      id: HandleId.TopLeft,
      position: Position.Top,
      className: "apollon-arc-handle apollon-arc-handle--top",
      style: { ...baseHandleStyle, left: leftStart },
    },
    {
      id: HandleId.TopMidLeft,
      position: Position.Top,
      style: { ...baseHandleStyle, left: leftMidStart },
    },
    {
      id: HandleId.Top,
      position: Position.Top,
      className: "apollon-arc-handle apollon-arc-handle--top",
      style: { ...baseHandleStyle, left: leftMiddle },
    },
    {
      id: HandleId.TopMidRight,
      position: Position.Top,
      style: { ...baseHandleStyle, left: leftMidEnd },
    },
    {
      id: HandleId.TopRight,
      position: Position.Top,
      className: "apollon-arc-handle apollon-arc-handle--top",
      style: { ...baseHandleStyle, left: leftEnd },
    },
    {
      id: HandleId.RightTop,
      position: Position.Right,
      className: "apollon-arc-handle apollon-arc-handle--right",
      style: { ...baseHandleStyle, top: topStart },
    },
    {
      id: HandleId.RightMidTop,
      position: Position.Right,
      style: { ...baseHandleStyle, top: topMidStart },
    },
    {
      id: HandleId.Right,
      position: Position.Right,
      className: "apollon-arc-handle apollon-arc-handle--right",
      style: { ...baseHandleStyle, top: topMiddle },
    },
    {
      id: HandleId.RightMidBottom,
      position: Position.Right,
      style: { ...baseHandleStyle, top: topMidEnd },
    },
    {
      id: HandleId.RightBottom,
      position: Position.Right,
      className: "apollon-arc-handle apollon-arc-handle--right",
      style: { ...baseHandleStyle, top: topEnd },
    },
    {
      id: HandleId.BottomRight,
      position: Position.Bottom,
      className: "apollon-arc-handle apollon-arc-handle--bottom",
      style: { ...baseHandleStyle, left: leftEnd },
    },
    {
      id: HandleId.BottomMidRight,
      position: Position.Bottom,
      style: { ...baseHandleStyle, left: leftMidEnd },
    },
    {
      id: HandleId.Bottom,
      position: Position.Bottom,
      className: "apollon-arc-handle apollon-arc-handle--bottom",
      style: { ...baseHandleStyle, left: leftMiddle },
    },
    {
      id: HandleId.BottomMidLeft,
      position: Position.Bottom,
      style: { ...baseHandleStyle, left: leftMidStart },
    },
    {
      id: HandleId.BottomLeft,
      position: Position.Bottom,
      className: "apollon-arc-handle apollon-arc-handle--bottom",
      style: { ...baseHandleStyle, left: leftStart },
    },
    {
      id: HandleId.LeftBottom,
      position: Position.Left,
      className: "apollon-arc-handle apollon-arc-handle--left",
      style: { ...baseHandleStyle, top: topEnd },
    },
    {
      id: HandleId.LeftMidBottom,
      position: Position.Left,
      style: { ...baseHandleStyle, top: topMidEnd },
    },
    {
      id: HandleId.Left,
      position: Position.Left,
      className: "apollon-arc-handle apollon-arc-handle--left",
      style: { ...baseHandleStyle, top: topMiddle },
    },
    {
      id: HandleId.LeftMidTop,
      position: Position.Left,
      style: { ...baseHandleStyle, top: topMidStart },
    },
    {
      id: HandleId.LeftTop,
      position: Position.Left,
      className: "apollon-arc-handle apollon-arc-handle--left",
      style: { ...baseHandleStyle, top: topStart },
    },
  ]

  const visibleHandleIds = new Set<HandleId>([
    HandleId.TopLeft,
    HandleId.Top,
    HandleId.TopRight,
    HandleId.RightTop,
    HandleId.Right,
    HandleId.RightBottom,
    HandleId.BottomRight,
    HandleId.Bottom,
    HandleId.BottomLeft,
    HandleId.LeftBottom,
    HandleId.Left,
    HandleId.LeftTop,
  ])

  return (
    <AssessmentSelectableWrapper elementId={elementId}>
      <FeedbackDropzone
        className={className}
        elementId={elementId}
        asElement="div"
        elementType={nodeType}
      >
        {hiddenHandles !== true && (
          <>
            {handles.map((handle) => {
              if (hiddenHandles.includes(handle.id)) {
                return null
              }

              const isPrimaryHandle = visibleHandleIds.has(handle.id)
              const isGuidanceTargetHandle =
                connectionGuidanceActive &&
                elementId === connectionGuidanceTargetNodeId &&
                handle.id === connectionGuidanceTargetHandleId
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
                    isGuidanceTargetHandle
                      ? "apollon-connection-guidance-target-active"
                      : "",
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
