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
import { useEffect, useRef } from "react"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { useIsOnlyThisElementSelected } from "@/hooks/useIsOnlyThisElementSelected"
import { UseCaseNodeSVG } from "@/components"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"
import { HandleId, NodeConnectionHandle } from "../wrappers"
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

  // Ellipse geometry matches the SVG rendering in UseCaseNodeSVG
  const centerX = width / 2
  const centerY = height / 2
  const radiusX = width / 2
  const radiusY = height / 2

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
