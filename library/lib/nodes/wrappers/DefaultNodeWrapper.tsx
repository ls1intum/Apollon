import { AssessmentSelectableWrapper } from "@/components/wrapper/AssessmentSelectableWrapper"
import { FeedbackDropzone } from "@/components/wrapper/FeedbackDropzone"
import { CANVAS } from "@/constants"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { Handle, Position, useReactFlow } from "@xyflow/react"

// Define enum for handle IDs
export enum HandleId {
  TopLeft = "top-left",
  Top = "top",
  TopRight = "top-right",
  RightTop = "right-top",
  Right = "right",
  RightBottom = "right-bottom",
  BottomRight = "bottom-right",
  Bottom = "bottom",
  BottomLeft = "bottom-left",
  LeftBottom = "left-bottom",
  Left = "left",
  LeftTop = "left-top",
}

// Preset for hiding corner and intermediate handles, showing only main directional handles
export const FOUR_WAY_HANDLES_PRESET: HandleId[] = [
  HandleId.TopLeft,
  HandleId.TopRight,
  HandleId.RightTop,
  HandleId.RightBottom,
  HandleId.BottomRight,
  HandleId.BottomLeft,
  HandleId.LeftBottom,
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
  const isDiagramModifiable = useDiagramModifiable()
  const snapGap = CANVAS.SNAP_TO_GRID_PX * 2
  const targetHandleSize = CANVAS.SNAP_TO_GRID_PX

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

  // Define all handles with their properties
  const handles = [
    {
      id: HandleId.Top,
      position: Position.Top,
      className: "apollon-arc-handle apollon-arc-handle--top",
      style: { ...baseHandleStyle },
    },
    {
      id: HandleId.Right,
      position: Position.Right,
      className: "apollon-arc-handle apollon-arc-handle--right",
      style: { ...baseHandleStyle },
    },
    {
      id: HandleId.Bottom,
      position: Position.Bottom,
      className: "apollon-arc-handle apollon-arc-handle--bottom",
      style: { ...baseHandleStyle },
    },
    {
      id: HandleId.Left,
      position: Position.Left,
      className: "apollon-arc-handle apollon-arc-handle--left",
      style: { ...baseHandleStyle },
    },
  ]

  const nodeWidth = node?.width ?? 120
  const nodeHeight = node?.height ?? 80

  const getRatios = (size: number): number[] => {
    if (size <= snapGap) {
      return [0.5]
    }

    const steps = Math.max(2, Math.floor(size / snapGap))
    return Array.from({ length: steps + 1 }, (_, index) => index / steps)
  }

  const horizontalRatios = getRatios(nodeWidth)
  const verticalRatios = getRatios(nodeHeight)

  const invisibleTargetBaseStyle = {
    width: targetHandleSize,
    height: targetHandleSize,
    position: "absolute" as const,
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "50%",
    opacity: 0,
    zIndex: 6,
    pointerEvents: "all" as const,
  }

  const makeTargetHandleStyle = (position: Position, ratio: number) => {
    switch (position) {
      case Position.Top:
        return {
          ...invisibleTargetBaseStyle,
          top: -targetHandleSize / 2,
          left: `${ratio * 100}%`,
          transform: "translateX(-50%)",
        }
      case Position.Right:
        return {
          ...invisibleTargetBaseStyle,
          right: -targetHandleSize / 2,
          top: `${ratio * 100}%`,
          transform: "translateY(-50%)",
        }
      case Position.Bottom:
        return {
          ...invisibleTargetBaseStyle,
          bottom: -targetHandleSize / 2,
          left: `${ratio * 100}%`,
          transform: "translateX(-50%)",
        }
      case Position.Left:
        return {
          ...invisibleTargetBaseStyle,
          left: -targetHandleSize / 2,
          top: `${ratio * 100}%`,
          transform: "translateY(-50%)",
        }
      default:
        return invisibleTargetBaseStyle
    }
  }

  const targetHandles = [
    ...horizontalRatios.map((ratio, index) => ({
      id: `top-snap-${index}`,
      side: HandleId.Top,
      position: Position.Top,
      ratio,
    })),
    ...horizontalRatios.map((ratio, index) => ({
      id: `bottom-snap-${index}`,
      side: HandleId.Bottom,
      position: Position.Bottom,
      ratio,
    })),
    ...verticalRatios.map((ratio, index) => ({
      id: `left-snap-${index}`,
      side: HandleId.Left,
      position: Position.Left,
      ratio,
    })),
    ...verticalRatios.map((ratio, index) => ({
      id: `right-snap-${index}`,
      side: HandleId.Right,
      position: Position.Right,
      ratio,
    })),
  ]

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
            {handles.map(
              (handle) =>
                !hiddenHandles.includes(handle.id) && (
                  <Handle
                    key={handle.id}
                    id={handle.id}
                    className={handle.className}
                    type="source"
                    position={handle.position}
                    style={handle.style}
                    isConnectable={isDiagramModifiable}
                  />
                )
            )}

            {targetHandles.map(
              (handle) =>
                !hiddenHandles.includes(handle.side) && (
                  <Handle
                    key={handle.id}
                    id={handle.id}
                    type="target"
                    position={handle.position}
                    style={makeTargetHandleStyle(handle.position, handle.ratio)}
                    isConnectable={isDiagramModifiable}
                  />
                )
            )}
          </>
        )}

        {children}
      </FeedbackDropzone>
    </AssessmentSelectableWrapper>
  )
}
