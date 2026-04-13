import {
  Handle,
  NodeProps,
  NodeResizer,
  Position,
  type Node,
} from "@xyflow/react"
import { DefaultNodeWrapper, HandleId } from "../wrappers"
import { useHandleOnResize } from "@/hooks"
import { DefaultNodeProps } from "@/types"
import { useRef } from "react"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { UseCaseNodeSVG } from "@/components"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"
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

  if (!width || !height) {
    return null
  }

  // Align handles with the rendered SVG ellipse edge. A tiny positive-edge
  // inset keeps right/bottom anchors from appearing visually offset.
  const ellipsePositiveEdgeInset = 0.5
  const centerX = width / 2 - ellipsePositiveEdgeInset / 2
  const centerY = height / 2 - ellipsePositiveEdgeInset / 2
  const radiusX = width / 2 - ellipsePositiveEdgeInset / 2
  const radiusY = height / 2 - ellipsePositiveEdgeInset / 2

  const handleDefs: {
    id: HandleId
    position: Position
    className?: string
  }[] = [
    {
      id: HandleId.TopLeft,
      position: Position.Top,
    },
    {
      id: HandleId.TopMidLeft,
      position: Position.Top,
    },
    {
      id: HandleId.Top,
      position: Position.Top,
      className: "apollon-arc-handle apollon-arc-handle--top",
    },
    {
      id: HandleId.TopMidRight,
      position: Position.Top,
    },
    {
      id: HandleId.TopRight,
      position: Position.Top,
    },
    {
      id: HandleId.RightTop,
      position: Position.Right,
    },
    {
      id: HandleId.RightMidTop,
      position: Position.Right,
    },
    {
      id: HandleId.Right,
      position: Position.Right,
      className: "apollon-arc-handle apollon-arc-handle--right",
    },
    {
      id: HandleId.RightMidBottom,
      position: Position.Right,
    },
    {
      id: HandleId.RightBottom,
      position: Position.Right,
    },
    {
      id: HandleId.BottomRight,
      position: Position.Bottom,
    },
    {
      id: HandleId.BottomMidRight,
      position: Position.Bottom,
    },
    {
      id: HandleId.Bottom,
      position: Position.Bottom,
      className: "apollon-arc-handle apollon-arc-handle--bottom",
    },
    {
      id: HandleId.BottomMidLeft,
      position: Position.Bottom,
    },
    {
      id: HandleId.BottomLeft,
      position: Position.Bottom,
    },
    {
      id: HandleId.LeftBottom,
      position: Position.Left,
    },
    {
      id: HandleId.LeftMidBottom,
      position: Position.Left,
    },
    {
      id: HandleId.Left,
      position: Position.Left,
      className: "apollon-arc-handle apollon-arc-handle--left",
    },
    {
      id: HandleId.LeftMidTop,
      position: Position.Left,
    },
    {
      id: HandleId.LeftTop,
      position: Position.Left,
    },
  ]

  const visibleHandleIds = new Set<HandleId>([
    HandleId.Top,
    HandleId.Right,
    HandleId.Bottom,
    HandleId.Left,
  ])

  const baseHandleStyle = {
    width: 8,
    height: 8,
    position: "absolute" as const,
    // We position handles by explicit x/y on the ellipse; neutralize
    // side-based handle offsets from React Flow classes.
    transform: "translate(-50%, -50%)",
    right: "auto",
    bottom: "auto",
    backgroundColor: "transparent",
    border: "none",
    zIndex: 10,
    transition: "opacity 120ms ease",
    overflow: "visible",
    boxSizing: "border-box" as const,
  }

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
        ...baseHandleStyle,
        left: pos.x,
        top: pos.y,
      },
      isPrimaryHandle: visibleHandleIds.has(def.id),
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

      {handles.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          className={handle.className}
          type="source"
          position={handle.position}
          style={
            handle.isPrimaryHandle
              ? handle.style
              : {
                  ...handle.style,
                  opacity: 0,
                  pointerEvents: "none",
                }
          }
          isConnectable={isDiagramModifiable}
          isConnectableStart={handle.isPrimaryHandle && isDiagramModifiable}
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
