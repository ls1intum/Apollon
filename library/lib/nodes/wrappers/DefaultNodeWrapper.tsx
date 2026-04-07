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

// function calculateAdjustedQuarter(x: number): number {
//   const quarter = x / 4 // Calculate 1/4 of x
//   return Math.floor(quarter / 10) * 10 // Round down to nearest multiple of 10
// }

export function DefaultNodeWrapper({
  elementId,
  children,
  // width = 0,
  // height = 0,
  hiddenHandles = [],
  className,
}: Props) {
  const { getNode } = useReactFlow()
  const nodeType = getNode(elementId)?.type
  const isDiagramModifiable = useDiagramModifiable()

  const baseHandleStyle = {
    backgroundColor: "rgba(0, 100, 255, 0.2)",
    border: "3px solid #0064ff",
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
      style: {
        ...baseHandleStyle,
        width: 40,
        height: 20,
        transform: "translate(-50%, -100%)",
        borderBottom: "none",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      },
    },
    {
      id: HandleId.Right,
      position: Position.Right,
      style: {
        ...baseHandleStyle,
        width: 20,
        height: 40,
        transform: "translate(100%, -50%)",
        borderLeft: "none",
        borderTopRightRadius: 20,
        borderBottomRightRadius: 20,
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
      },
    },
    {
      id: HandleId.Bottom,
      position: Position.Bottom,
      style: {
        ...baseHandleStyle,
        width: 40,
        height: 20,
        transform: "translate(-50%, 100%)",
        borderTop: "none",
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
      },
    },
    {
      id: HandleId.Left,
      position: Position.Left,
      style: {
        ...baseHandleStyle,
        width: 20,
        height: 40,
        transform: "translate(-100%, -50%)",
        borderRight: "none",
        borderTopLeftRadius: 20,
        borderBottomLeftRadius: 20,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
      },
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
