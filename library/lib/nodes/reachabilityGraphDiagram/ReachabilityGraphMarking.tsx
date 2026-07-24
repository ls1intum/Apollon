import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@/hooks/usePopoverAnchor"
import { DefaultNodeWrapper, NodeResizer } from "../wrappers"
import { useHandleOnResize } from "@/hooks"
import { ReachabilityGraphMarkingProps } from "@/types"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { ReachabilityGraphMarkingSVG } from "@/components/svgs/nodes/reachabilityGraphDiagram/ReachabilityGraphMarkingSVG"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"

export function ReachabilityGraphMarking({
  id,
  width,
  height,
  data,
  parentId,
}: NodeProps<Node<ReachabilityGraphMarkingProps>>) {
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
        minHeight={50}
        minWidth={50}
      />
      <div ref={anchorRef}>
        <ReachabilityGraphMarkingSVG
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
        type="ReachabilityGraphMarking"
      />
    </DefaultNodeWrapper>
  )
}
