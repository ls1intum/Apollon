import { NodeProps, NodeResizer, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@/hooks/usePopoverAnchor"
import { DefaultNodeWrapper } from "../wrappers"
import { useHandleOnResize } from "@/hooks"
import { ActivitySwimlaneProps } from "@/types"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { ActivitySwimlaneSVG } from "@/components/svgs/nodes/activityDiagram/ActivitySwimlaneSVG"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"

export function ActivitySwimlane({
  id,
  width,
  height,
  data,
  parentId,
}: NodeProps<Node<ActivitySwimlaneProps>>) {
  const [anchorEl, anchorRef] = usePopoverAnchor()
  const { onResize } = useHandleOnResize(parentId)
  const isDiagramModifiable = useDiagramModifiable()

  if (!width || !height) {
    return null
  }

  return (
    <DefaultNodeWrapper width={width} height={height} elementId={id}>
      <NodeToolbar elementId={id} />
      <NodeResizer
        isVisible={isDiagramModifiable}
        onResize={onResize}
        minHeight={120}
        minWidth={120}
        handleStyle={{ width: 8, height: 8 }}
      />
      <div ref={anchorRef}>
        <ActivitySwimlaneSVG
          width={width}
          height={height}
          data={data}
          id={id}
          showAssessmentResults={!isDiagramModifiable}
        />
      </div>

      <PopoverManager
        anchorEl={anchorEl}
        elementId={id}
        type="ActivitySwimlane"
      />
    </DefaultNodeWrapper>
  )
}
