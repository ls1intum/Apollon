import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@/hooks/usePopoverAnchor"
import { DefaultNodeWrapper } from "../wrappers"
import { DefaultNodeProps } from "@/types"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { ActivityInitialNodeSVG } from "@/components/svgs/nodes"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"

export function ActivityInitialNode({
  id,
  width,
  height,
}: NodeProps<Node<DefaultNodeProps>>) {
  const [anchorEl, anchorRef] = usePopoverAnchor()

  const isDiagramModifiable = useDiagramModifiable()

  if (!width || !height) {
    return null
  }
  return (
    <DefaultNodeWrapper elementId={id}>
      <NodeToolbar elementId={id} />
      <div ref={anchorRef}>
        <ActivityInitialNodeSVG
          width={width}
          height={height}
          id={id}
          showAssessmentResults={!isDiagramModifiable}
        />
      </div>

      <PopoverManager anchorEl={anchorEl} elementId={id} type="default" />
    </DefaultNodeWrapper>
  )
}
