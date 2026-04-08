import { AssessmentSelectableWrapper } from "@/components/wrapper/AssessmentSelectableWrapper"
import { FeedbackDropzone } from "@/components/wrapper/FeedbackDropzone"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { useIsOnlyThisElementSelected } from "@/hooks/useIsOnlyThisElementSelected"
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

function calculateAdjustedQuarter(x: number): number {
  const quarter = x / 4 // Calculate 1/4 of x
  return Math.floor(quarter / 10) * 10 // Round down to nearest multiple of 10
}

export function DefaultNodeWrapper({
  elementId,
  children,
  width = 0,
  height = 0,
  hiddenHandles = [],
  className,
}: Props) {
  const { getNode } = useReactFlow()
  const nodeType = getNode(elementId)?.type
  const adjustedWidth = calculateAdjustedQuarter(width)
  const adjustedHeight = calculateAdjustedQuarter(height)
  const selected = useIsOnlyThisElementSelected(elementId)
  const isDiagramModifiable = useDiagramModifiable()

  const selectedHandleStyle = {
    opacity: 0.6,
    padding: 4,
    backgroundColor: "rgb(99, 154, 242)",
    zIndex: 10,
    border: "0px",
  }

  const handleStyle = selected ? selectedHandleStyle : { border: "0px" }

  // Define all handles with their properties
  const handles = [
    {
      id: HandleId.TopLeft,
      position: Position.Top,
      style: { left: adjustedWidth, ...handleStyle },
    },
    {
      id: HandleId.Top,
      position: Position.Top,
      style: { ...handleStyle },
    },
    {
      id: HandleId.TopRight,
      position: Position.Top,
      style: { left: width - adjustedWidth, ...handleStyle },
    },
    {
      id: HandleId.RightTop,
      position: Position.Right,
      style: { top: adjustedHeight, ...handleStyle },
    },
    {
      id: HandleId.Right,
      position: Position.Right,
      style: { ...handleStyle },
    },
    {
      id: HandleId.RightBottom,
      position: Position.Right,
      style: { top: height - adjustedHeight, ...handleStyle },
    },
    {
      id: HandleId.BottomRight,
      position: Position.Bottom,
      style: { left: width - adjustedWidth, ...handleStyle },
    },
    {
      id: HandleId.Bottom,
      position: Position.Bottom,
      style: { ...handleStyle },
    },
    {
      id: HandleId.BottomLeft,
      position: Position.Bottom,
      style: { left: adjustedWidth, ...handleStyle },
    },
    {
      id: HandleId.LeftBottom,
      position: Position.Left,
      style: { top: height - adjustedHeight, ...handleStyle },
    },
    {
      id: HandleId.Left,
      position: Position.Left,
      style: { ...handleStyle },
    },
    {
      id: HandleId.LeftTop,
      position: Position.Left,
      style: { top: adjustedHeight, ...handleStyle },
    },
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
                    type="source"
                    position={handle.position}
                    style={handle.style}
                    isValidConnection={(connection) =>
                      !(
                        connection.source === elementId &&
                        connection.target === elementId &&
                        connection.sourceHandle === handle.id &&
                        connection.targetHandle === handle.id
                      )
                    }
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
