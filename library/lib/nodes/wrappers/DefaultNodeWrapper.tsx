import { AssessmentSelectableWrapper } from "@/components/wrapper/AssessmentSelectableWrapper"
import { FeedbackDropzone } from "@/components/wrapper/FeedbackDropzone"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { useIsOnlyThisElementSelected } from "@/hooks/useIsOnlyThisElementSelected"
import {
  Handle,
  Position,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react"
import { useEffect } from "react"
import type { CSSProperties } from "react"

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

const HANDLE_BOX_SIZE = 10
const LEGACY_HANDLE_SIZE = 6
const LEGACY_HANDLE_OFFSET = LEGACY_HANDLE_SIZE / 2
const HANDLE_BOX_HALF = HANDLE_BOX_SIZE / 2
const HANDLE_BOX_Z_INDEX = 10

function snapHandleCoordinate(
  value: CSSProperties["top"]
): CSSProperties["top"] {
  return typeof value === "number" ? Math.round(value) : value
}

function snapHandleStyle(style?: CSSProperties): CSSProperties | undefined {
  if (!style) {
    return style
  }

  return {
    ...style,
    top: snapHandleCoordinate(style.top),
    right: snapHandleCoordinate(style.right),
    bottom: snapHandleCoordinate(style.bottom),
    left: snapHandleCoordinate(style.left),
  }
}

function offsetHandleCoordinate(
  value: CSSProperties["top"],
  delta: number
): CSSProperties["top"] {
  if (typeof value === "number") {
    return Math.round(value + delta)
  }

  if (typeof value === "string") {
    return `calc(${value} + ${delta}px)`
  }

  return value
}

function getNodeHandleStyle(
  position: Position,
  style?: CSSProperties
): CSSProperties {
  const snappedStyle = snapHandleStyle(style)

  const baseStyle: CSSProperties = {
    ...snappedStyle,
    width: HANDLE_BOX_SIZE,
    height: HANDLE_BOX_SIZE,
    minWidth: HANDLE_BOX_SIZE,
    minHeight: HANDLE_BOX_SIZE,
    backgroundColor: "transparent",
    border: "0px",
    overflow: "visible",
    zIndex: HANDLE_BOX_Z_INDEX,
  }

  switch (position) {
    case Position.Top: {
      const topDelta = HANDLE_BOX_HALF - LEGACY_HANDLE_OFFSET
      return {
        ...baseStyle,
        top:
          snappedStyle?.top != null
            ? offsetHandleCoordinate(snappedStyle.top, topDelta)
            : topDelta,
      }
    }
    case Position.Left: {
      const leftDelta = HANDLE_BOX_HALF - LEGACY_HANDLE_OFFSET
      return {
        ...baseStyle,
        left:
          snappedStyle?.left != null
            ? offsetHandleCoordinate(snappedStyle.left, leftDelta)
            : leftDelta,
      }
    }
    case Position.Right: {
      if (snappedStyle?.left != null) {
        const leftDelta =
          LEGACY_HANDLE_SIZE +
          LEGACY_HANDLE_OFFSET -
          (HANDLE_BOX_SIZE + HANDLE_BOX_HALF)

        return {
          ...baseStyle,
          left: offsetHandleCoordinate(snappedStyle.left, leftDelta),
          right: "auto",
        }
      }

      const rightDelta = HANDLE_BOX_HALF - LEGACY_HANDLE_OFFSET

      return {
        ...baseStyle,
        right:
          snappedStyle?.right != null
            ? offsetHandleCoordinate(snappedStyle.right, rightDelta)
            : rightDelta,
      }
    }
    case Position.Bottom: {
      if (snappedStyle?.top != null) {
        const topDelta =
          LEGACY_HANDLE_SIZE +
          LEGACY_HANDLE_OFFSET -
          (HANDLE_BOX_SIZE + HANDLE_BOX_HALF)

        return {
          ...baseStyle,
          top: offsetHandleCoordinate(snappedStyle.top, topDelta),
          bottom: "auto",
        }
      }

      const bottomDelta = HANDLE_BOX_HALF - LEGACY_HANDLE_OFFSET

      return {
        ...baseStyle,
        bottom:
          snappedStyle?.bottom != null
            ? offsetHandleCoordinate(snappedStyle.bottom, bottomDelta)
            : bottomDelta,
      }
    }
  }
}

function DirectionalHandleArrow() {
  return (
    <svg
      className="apollon-node-handle__arrow-icon"
      viewBox="0 0 14 14"
      aria-hidden="true"
    >
      <path
        d="M2.5 7 H11.5 M8.5 4 L11.5 7 L8.5 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function NodeConnectionHandle({
  id,
  position,
  style,
  isConnectable,
  selected,
}: {
  id: HandleId
  position: Position
  style?: CSSProperties
  isConnectable: boolean
  selected: boolean
}) {
  return (
    <Handle
      id={id}
      type="source"
      position={position}
      className="apollon-node-handle"
      data-handle-direction={position}
      data-selected={selected ? "true" : "false"}
      style={getNodeHandleStyle(position, style)}
      isConnectable={isConnectable}
    >
      <span
        aria-hidden="true"
        className="apollon-node-handle__visual source nodrag"
      >
        <span className="apollon-node-handle__arrow">
          <DirectionalHandleArrow />
        </span>
      </span>
    </Handle>
  )
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
  const updateNodeInternals = useUpdateNodeInternals()
  const nodeType = getNode(elementId)?.type
  const adjustedWidth = calculateAdjustedQuarter(width)
  const adjustedHeight = calculateAdjustedQuarter(height)
  const selected = useIsOnlyThisElementSelected(elementId)
  const isDiagramModifiable = useDiagramModifiable()
  const hiddenHandlesKey =
    hiddenHandles === true ? "all" : hiddenHandles.join("|")

  useEffect(() => {
    updateNodeInternals(elementId)
  }, [elementId, hiddenHandlesKey, height, updateNodeInternals, width])

  // Define all handles with their properties
  const handles = [
    {
      id: HandleId.TopLeft,
      position: Position.Top,
      style: { left: adjustedWidth },
    },
    {
      id: HandleId.Top,
      position: Position.Top,
      style: {},
    },
    {
      id: HandleId.TopRight,
      position: Position.Top,
      style: { left: width - adjustedWidth },
    },
    {
      id: HandleId.RightTop,
      position: Position.Right,
      style: { top: adjustedHeight },
    },
    {
      id: HandleId.Right,
      position: Position.Right,
      style: {},
    },
    {
      id: HandleId.RightBottom,
      position: Position.Right,
      style: { top: height - adjustedHeight },
    },
    {
      id: HandleId.BottomRight,
      position: Position.Bottom,
      style: { left: width - adjustedWidth },
    },
    {
      id: HandleId.Bottom,
      position: Position.Bottom,
      style: {},
    },
    {
      id: HandleId.BottomLeft,
      position: Position.Bottom,
      style: { left: adjustedWidth },
    },
    {
      id: HandleId.LeftBottom,
      position: Position.Left,
      style: { top: height - adjustedHeight },
    },
    {
      id: HandleId.Left,
      position: Position.Left,
      style: {},
    },
    {
      id: HandleId.LeftTop,
      position: Position.Left,
      style: { top: adjustedHeight },
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
                  <NodeConnectionHandle
                    key={handle.id}
                    id={handle.id}
                    position={handle.position}
                    style={handle.style}
                    isConnectable={isDiagramModifiable}
                    selected={selected}
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
