import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@/hooks/usePopoverAnchor"
import { DefaultNodeWrapper } from "../wrappers"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { DefaultNodeProps } from "@/types"
import { SfcStartNodeSVG } from "@/components"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"
import { PopoverManager } from "@/components/popovers/PopoverManager"

export function SfcStart({
  id,
  width,
  height,
  data,
}: NodeProps<Node<DefaultNodeProps>>) {
  const [anchorEl, anchorRef] = usePopoverAnchor()
  const isDiagramModifiable = useDiagramModifiable()

  if (!width || !height) {
    return null
  }

  return (
    <DefaultNodeWrapper width={width} height={height} elementId={id}>
      <NodeToolbar elementId={id} showEdit={false} />

      <div ref={anchorRef}>
        <SfcStartNodeSVG
          width={width}
          height={height}
          data={data}
          id={id}
          showAssessmentResults={!isDiagramModifiable}
        />
      </div>

      <PopoverManager anchorEl={anchorEl} elementId={id} type="default" />
    </DefaultNodeWrapper>
  )
}
