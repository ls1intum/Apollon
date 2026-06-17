import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@/hooks/usePopoverAnchor"
import { DefaultNodeWrapper, FOUR_WAY_HANDLES_PRESET } from "../wrappers"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { BPMNEventProps } from "@/types"
import { BPMNEventNodeSVG } from "@/components"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"

export function BPMNEndEvent({
  id,
  width = 40,
  height = 40,
  data,
}: NodeProps<Node<BPMNEventProps>>) {
  const [anchorEl, anchorRef] = usePopoverAnchor()
  const isDiagramModifiable = useDiagramModifiable()

  return (
    <DefaultNodeWrapper
      width={width}
      height={height}
      elementId={id}
      hiddenHandles={FOUR_WAY_HANDLES_PRESET}
    >
      <NodeToolbar elementId={id} />

      {/* Events are fixed size, no resizer */}
      <div ref={anchorRef}>
        <BPMNEventNodeSVG
          width={width}
          height={height}
          id={id}
          data={data}
          variant="end"
          showAssessmentResults={!isDiagramModifiable}
        />
      </div>
      <PopoverManager anchorEl={anchorEl} elementId={id} type="BPMNEndEvent" />
    </DefaultNodeWrapper>
  )
}
