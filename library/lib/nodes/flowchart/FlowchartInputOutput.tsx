import { NodeProps, NodeResizer, type Node, Handle, Position } from "@xyflow/react"
import { DefaultNodeWrapper } from "../wrappers"
import { useHandleOnResize } from "@/hooks"
import { DefaultNodeProps } from "@/types"
import { useIsOnlyThisElementSelected } from "@/hooks/useIsOnlyThisElementSelected"
import { FlowchartInputOutputNodeSVG } from "@/components"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"
import { HandleId } from "../wrappers"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { useRef } from "react"
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
  const isDiagramModifiable = useDiagramModifiable()
  const selected = useIsOnlyThisElementSelected(id)

  if (!width || !height) {
    return null
  }

  // Parallelogram offset (same as in SVG)
  const offset = 20
  const adjustedWidth = calculateAdjustedQuarter(width)
  const adjustedHeight = calculateAdjustedQuarter(height)

  const selectedHandleStyle = {
    opacity: 0.6,
    padding: 4,
    backgroundColor: "rgb(99, 154, 242)",
    zIndex: 10,
    border: "0px",
  }

  const handleStyle = selected ? selectedHandleStyle : { border: "0px" }

  // Custom handles for parallelogram shape
  // Left edge goes from (0, height) to (offset, 0)
  // Right edge goes from (width, 0) to (width - offset, height)
  const handles = [
    // Top edge: from (offset, 0) to (width, 0)
    {
      id: HandleId.TopLeft,
      position: Position.Top,
      style: { left: offset + adjustedWidth, ...handleStyle },
    },
    {
      id: HandleId.Top,
      position: Position.Top,
      style: { left: (offset + width) / 2, ...handleStyle },
    },
    {
      id: HandleId.TopRight,
      position: Position.Top,
      style: { left: width - adjustedWidth, ...handleStyle },
    },
    // Right edge: from (width, 0) to (width - offset, height) - slanted
    {
      id: HandleId.RightTop,
      position: Position.Right,
      style: { 
        top: adjustedHeight, 
        left: width - (adjustedHeight / 0.3 / height) * offset,
        ...handleStyle 
      },
    },
    {
      id: HandleId.Right,
      position: Position.Right,
      style: { 
        top: height / 2,
        left: width - (height / 1.2 / height) * offset,
        ...handleStyle 
      },
    },
    {
      id: HandleId.RightBottom,
      position: Position.Right,
      style: { 
        top: height - adjustedHeight,
        left: width - ((height - adjustedHeight) / 0.75 / height) * offset,
        ...handleStyle 
      },
    },
    // Bottom edge: from (width - offset, height) to (0, height)
    {
      id: HandleId.BottomRight,
      position: Position.Bottom,
      style: { left: width - offset - adjustedWidth, ...handleStyle },
    },
    {
      id: HandleId.Bottom,
      position: Position.Bottom,
      style: { left: (width - offset) / 2, ...handleStyle },
    },
    {
      id: HandleId.BottomLeft,
      position: Position.Bottom,
      style: { left: adjustedWidth, ...handleStyle },
    },
    // Left edge: from (0, height) to (offset, 0) - slanted
    {
      id: HandleId.LeftBottom,
      position: Position.Left,
      style: { 
        top: height - adjustedHeight,
        left: offset * adjustedHeight / height,
        ...handleStyle 
      },
    },
    {
      id: HandleId.Left,
      position: Position.Left,
      style: { 
        top: height / 2,
        left: offset * (height / 2) / height,
        ...handleStyle 
      },
    },
    {
      id: HandleId.LeftTop,
      position: Position.Left,
      style: { 
        top: adjustedHeight,
        left: offset * (height - adjustedHeight) / height,
        ...handleStyle 
      },
    },
  ]

  return (
    <DefaultNodeWrapper width={width} height={height} elementId={id} hiddenHandles={true}>
      <NodeToolbar elementId={id} />
      
      {/* Custom handles for parallelogram */}
      {handles.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="source"
          position={handle.position}
          style={handle.style}
          isConnectable={isDiagramModifiable}
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