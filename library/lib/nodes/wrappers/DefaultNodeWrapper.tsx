import { AssessmentSelectableWrapper } from "@/components/wrapper/AssessmentSelectableWrapper"
import { FeedbackDropzone } from "@/components/wrapper/FeedbackDropzone"
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
  const nodeType = getNode(elementId)?.type
  const isDiagramModifiable = useDiagramModifiable()

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
  // but only the primary four are visible.
  const handles = [
    {
      id: HandleId.TopLeft,
      position: Position.Top,
      style: { ...baseHandleStyle, left: "33.333%" },
    },
    {
      id: HandleId.Top,
      position: Position.Top,
      className: "apollon-arc-handle apollon-arc-handle--top",
      style: { ...baseHandleStyle },
    },
    {
      id: HandleId.TopRight,
      position: Position.Top,
      style: { ...baseHandleStyle, left: "66.666%" },
    },
    {
      id: HandleId.RightTop,
      position: Position.Right,
      style: { ...baseHandleStyle, top: "33.333%" },
    },
    {
      id: HandleId.Right,
      position: Position.Right,
      className: "apollon-arc-handle apollon-arc-handle--right",
      style: { ...baseHandleStyle },
    },
    {
      id: HandleId.RightBottom,
      position: Position.Right,
      style: { ...baseHandleStyle, top: "66.666%" },
    },
    {
      id: HandleId.BottomRight,
      position: Position.Bottom,
      style: { ...baseHandleStyle, left: "66.666%" },
    },
    {
      id: HandleId.Bottom,
      position: Position.Bottom,
      className: "apollon-arc-handle apollon-arc-handle--bottom",
      style: { ...baseHandleStyle },
    },
    {
      id: HandleId.BottomLeft,
      position: Position.Bottom,
      style: { ...baseHandleStyle, left: "33.333%" },
    },
    {
      id: HandleId.LeftBottom,
      position: Position.Left,
      style: { ...baseHandleStyle, top: "66.666%" },
    },
    {
      id: HandleId.Left,
      position: Position.Left,
      className: "apollon-arc-handle apollon-arc-handle--left",
      style: { ...baseHandleStyle },
    },
    {
      id: HandleId.LeftTop,
      position: Position.Left,
      style: { ...baseHandleStyle, top: "33.333%" },
    },
  ]

  const visibleHandleIds = new Set<HandleId>([
    HandleId.Top,
    HandleId.Right,
    HandleId.Bottom,
    HandleId.Left,
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

              return (
                <Handle
                  key={handle.id}
                  id={handle.id}
                  className={handle.className}
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
