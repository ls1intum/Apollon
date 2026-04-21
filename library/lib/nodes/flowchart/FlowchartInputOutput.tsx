import {
  NodeProps,
  NodeResizer,
  type Node,
  Position,
  useUpdateNodeInternals,
} from "@xyflow/react"
import { DefaultNodeWrapper } from "../wrappers"
import { useHandleOnResize } from "@/hooks"
import { DefaultNodeProps } from "@/types"
import { useIsOnlyThisElementSelected } from "@/hooks/useIsOnlyThisElementSelected"
import { FlowchartInputOutputNodeSVG } from "@/components"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"
import { HandleId, NodeConnectionHandle } from "../wrappers"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { useEffect, useRef } from "react"
import { PopoverManager } from "@/components/popovers/PopoverManager"

function calculateAdjustedQuarter(x: number): number {
  const quarter = x / 4
  return Math.floor(quarter / 10) * 10
}

export function FlowchartInputOutput({
  id,
  width,
  height,
  data,
  parentId,
}: NodeProps<Node<DefaultNodeProps>>) {
  const svgWrapperRef = useRef<HTMLDivElement | null>(null)
  const { onResize } = useHandleOnResize(parentId)
  const updateNodeInternals = useUpdateNodeInternals()
  const isDiagramModifiable = useDiagramModifiable()
  const selected = useIsOnlyThisElementSelected(id)

  useEffect(() => {
    if (width && height) {
      updateNodeInternals(id)
    }
  }, [height, id, updateNodeInternals, width])

  if (!width || !height) {
    return null
  }

  // Parallelogram offset (same as in SVG)
  const offset = 20
  const adjustedWidth = calculateAdjustedQuarter(width)
  const adjustedHeight = calculateAdjustedQuarter(height)

  // Custom handles for parallelogram shape
  // Left edge goes from (0, height) to (offset, 0)
  // Right edge goes from (width, 0) to (width - offset, height)
  const handles = [
    // Top edge: from (offset, 0) to (width, 0)
    {
      id: HandleId.TopLeft,
      position: Position.Top,
      style: { left: offset + adjustedWidth },
    },
    {
      id: HandleId.Top,
      position: Position.Top,
      style: { left: (offset + width) / 2 },
    },
    {
      id: HandleId.TopRight,
      position: Position.Top,
      style: { left: width - adjustedWidth },
    },
    // Right edge: from (width, 0) to (width - offset, height) - slanted
    {
      id: HandleId.RightTop,
      position: Position.Right,
      style: {
        top: adjustedHeight,
        left: width - (adjustedHeight / 0.3 / height) * offset,
      },
    },
    {
      id: HandleId.Right,
      position: Position.Right,
      style: {
        top: height / 2,
        left: width - (height / 1.2 / height) * offset,
      },
    },
    {
      id: HandleId.RightBottom,
      position: Position.Right,
      style: {
        top: height - adjustedHeight,
        left: width - ((height - adjustedHeight) / 0.75 / height) * offset,
      },
    },
    // Bottom edge: from (width - offset, height) to (0, height)
    {
      id: HandleId.BottomRight,
      position: Position.Bottom,
      style: { left: width - offset - adjustedWidth },
    },
    {
      id: HandleId.Bottom,
      position: Position.Bottom,
      style: { left: (width - offset) / 2 },
    },
    {
      id: HandleId.BottomLeft,
      position: Position.Bottom,
      style: { left: adjustedWidth },
    },
    // Left edge: from (0, height) to (offset, 0) - slanted
    {
      id: HandleId.LeftBottom,
      position: Position.Left,
      style: {
        top: height - adjustedHeight,
        left: (offset * adjustedHeight) / height,
      },
    },
    {
      id: HandleId.Left,
      position: Position.Left,
      style: {
        top: height / 2,
        left: (offset * (height / 2)) / height,
      },
    },
    {
      id: HandleId.LeftTop,
      position: Position.Left,
      style: {
        top: adjustedHeight,
        left: (offset * (height - adjustedHeight)) / height,
      },
    },
  ]

  return (
    <DefaultNodeWrapper
      width={width}
      height={height}
      elementId={id}
      hiddenHandles={true}
    >
      <NodeToolbar elementId={id} />

      {/* Custom handles for parallelogram */}
      {handles.map((handle) => (
        <NodeConnectionHandle
          key={handle.id}
          id={handle.id}
          position={handle.position}
          style={handle.style}
          isConnectable={isDiagramModifiable}
          selected={selected}
        />
      ))}

      <NodeResizer
        isVisible={isDiagramModifiable && !!selected}
        onResize={onResize}
        minHeight={50}
        minWidth={50}
        handleStyle={{ width: 8, height: 8 }}
      />
      <div ref={svgWrapperRef}>
        <FlowchartInputOutputNodeSVG
          width={width}
          height={height}
          id={id}
          showAssessmentResults={!isDiagramModifiable}
          data={data}
        />
      </div>

      <PopoverManager
        anchorEl={svgWrapperRef.current}
        elementId={id}
        type="FlowchartInputOutput"
      />
    </DefaultNodeWrapper>
  )
}
