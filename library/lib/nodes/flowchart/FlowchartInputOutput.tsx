import {
  NodeProps,
  NodeResizer,
  type Node,
  Handle,
  Position,
} from "@xyflow/react"
import { DefaultNodeWrapper } from "../wrappers"
import { useHandleOnResize } from "@/hooks"
import { DefaultNodeProps } from "@/types"
import { FlowchartInputOutputNodeSVG } from "@/components"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"
import { HandleId } from "../wrappers"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { useRef } from "react"
import { PopoverManager } from "@/components/popovers/PopoverManager"

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

  if (!width || !height) {
    return null
  }

  const offset = 20
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

  const handles = [
    {
      id: HandleId.Top,
      position: Position.Top,
      className: "apollon-arc-handle apollon-arc-handle--top",
      style: { left: width / 2, ...baseHandleStyle },
    },
    {
      id: HandleId.Right,
      position: Position.Right,
      className: "apollon-arc-handle apollon-arc-handle--right",
      style: {
        top: height / 2,
        right: offset / 2,
        ...baseHandleStyle,
      },
    },
    {
      id: HandleId.Bottom,
      position: Position.Bottom,
      className: "apollon-arc-handle apollon-arc-handle--bottom",
      style: { left: width / 2, ...baseHandleStyle },
    },
    {
      id: HandleId.Left,
      position: Position.Left,
      className: "apollon-arc-handle apollon-arc-handle--left",
      style: {
        top: height / 2,
        left: offset / 2,
        ...baseHandleStyle,
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

      {handles.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="source"
          position={handle.position}
          className={handle.className}
          style={handle.style}
          isConnectable={isDiagramModifiable}
        />
      ))}

      <NodeResizer
        isVisible={isDiagramModifiable}
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
