import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@/hooks/usePopoverAnchor"
import { DefaultNodeWrapper, FOUR_WAY_HANDLES_PRESET } from "../wrappers"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { BPMNGatewayProps } from "@/types"
import { BPMNGatewayNodeSVG } from "@/components"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"

export function BPMNGateway({
  id,
  width = 40,
  height = 40,
  data,
}: NodeProps<Node<BPMNGatewayProps>>) {
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

      <div ref={anchorRef}>
        <BPMNGatewayNodeSVG
          width={width}
          height={height}
          id={id}
          data={data}
          showAssessmentResults={!isDiagramModifiable}
        />
      </div>
      <PopoverManager anchorEl={anchorEl} elementId={id} type="BPMNGateway" />
    </DefaultNodeWrapper>
  )
}
