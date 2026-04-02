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
import { useRef } from "react"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { useIsOnlyThisElementSelected } from "@/hooks/useIsOnlyThisElementSelected"
import { UseCaseNodeSVG } from "@/components"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"
import { HandleId } from "../wrappers"
import { getEllipseHandlePosition } from "@/utils/edgeUtils"

export function UseCase({
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

  // Ellipse geometry matches the SVG rendering in UseCaseNodeSVG
  const centerX = width / 2
  const centerY = height / 2
  const radiusX = width / 2
  const radiusY = height / 2

  const selectedHandleStyle = {
    opacity: 0.6,
    padding: 4,
    backgroundColor: "rgb(99, 154, 242)",
    zIndex: 10,
    border: "0px",
  }

  const handleStyle = selected ? selectedHandleStyle : { border: "0px" }

  // All 12 handles placed on the ellipse perimeter
  const handleDefs: { id: HandleId; position: Position }[] = [
    { id: HandleId.Top, position: Position.Top },
    { id: HandleId.TopRight, position: Position.Top },
    { id: HandleId.RightTop, position: Position.Right },
    { id: HandleId.Right, position: Position.Right },
    { id: HandleId.RightBottom, position: Position.Right },
    { id: HandleId.BottomRight, position: Position.Bottom },
    { id: HandleId.Bottom, position: Position.Bottom },
    { id: HandleId.BottomLeft, position: Position.Bottom },
    { id: HandleId.LeftBottom, position: Position.Left },
    { id: HandleId.Left, position: Position.Left },
    { id: HandleId.LeftTop, position: Position.Left },
    { id: HandleId.TopLeft, position: Position.Top },
  ]

  const handles = handleDefs.map((def) => {
    const pos = getEllipseHandlePosition(
      centerX,
      centerY,
      radiusX,
      radiusY,
      def.id
    )
    return {
      ...def,
      style: {
        left: pos.x,
        top: pos.y,
        ...handleStyle,
      },
    }
  })

  return (
    <DefaultNodeWrapper
      width={width}
      height={height}
      elementId={id}
      hiddenHandles={true}
    >
      <NodeToolbar elementId={id} />

      {/* Custom handles placed on ellipse perimeter */}
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
        <UseCaseNodeSVG
          width={width}
          height={height}
          data={data}
          id={id}
          showAssessmentResults={!isDiagramModifiable}
        />
      </div>

      <PopoverManager
        anchorEl={svgWrapperRef.current}
        elementId={id}
        type="default"
      />
    </DefaultNodeWrapper>
  )
}
