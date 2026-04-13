import { NodeProps, NodeResizer, type Node } from "@xyflow/react"
import { DefaultNodeWrapper, HandleId } from "../wrappers"
import { useHandleOnResize } from "@/hooks"
import { DefaultNodeProps } from "@/types"
import { useRef } from "react"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { ActivityForkNodeHorizontalSVG } from "@/components/svgs/nodes"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"

export function ActivityForkNodeHorizontal({
  id,
  width,
  height,
  parentId,
  data,
}: NodeProps<Node<DefaultNodeProps>>) {
  const svgWrapperRef = useRef<HTMLDivElement | null>(null)
  const { onResize } = useHandleOnResize(parentId)
  const isDiagramModifiable = useDiagramModifiable()

  if (!width || !height) {
    return null
  }

  return (
    <DefaultNodeWrapper
      width={width}
      height={height}
      elementId={id}
      hiddenHandles={[
        HandleId.LeftTop,
        HandleId.LeftBottom,
        HandleId.RightTop,
        HandleId.RightBottom,
      ]}
      className="horizontally-not-resizable"
    >
      <NodeToolbar elementId={id} />
      <NodeResizer
        isVisible={isDiagramModifiable}
        onResize={onResize}
        minHeight={20}
        maxHeight={20}
        handleStyle={{ width: 8, height: 8 }}
      />
      <div ref={svgWrapperRef}>
        <ActivityForkNodeHorizontalSVG
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
        type="default"
      />
    </DefaultNodeWrapper>
  )
}
