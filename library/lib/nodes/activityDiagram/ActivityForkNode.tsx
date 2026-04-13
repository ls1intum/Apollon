import { NodeProps, NodeResizer, type Node } from "@xyflow/react"
import { DefaultNodeWrapper, HandleId } from "../wrappers"
import { useHandleOnResize } from "@/hooks"
import { DefaultNodeProps } from "@/types"
import { useRef } from "react"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { ActivityForkNodeSVG } from "@/components/svgs/nodes"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"

export function ActivityForkNode({
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
        HandleId.TopLeft,
        HandleId.TopRight,
        HandleId.BottomLeft,
        HandleId.BottomRight,
      ]}
      className="vertically-not-resizable"
    >
      <NodeToolbar elementId={id} />
      <NodeResizer
        isVisible={isDiagramModifiable}
        onResize={onResize}
        minWidth={20}
        maxWidth={20}
        handleStyle={{ width: 8, height: 8 }}
      />
      <div ref={svgWrapperRef}>
        <ActivityForkNodeSVG
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
