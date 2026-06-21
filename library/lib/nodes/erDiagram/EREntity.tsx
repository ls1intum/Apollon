import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@/hooks/usePopoverAnchor"
import { EREntitySVG } from "@/components"
import { ErEntityProps } from "@/types"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { DefaultNodeWrapper } from "../wrappers"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"

export function EREntity({
  id,
  width,
  height,
  data,
}: NodeProps<Node<ErEntityProps>>) {
  const [anchorEl, anchorRef] = usePopoverAnchor()
  const isDiagramModifiable = useDiagramModifiable()

  if (!width || !height) {
    return null
  }

  return (
    <DefaultNodeWrapper elementId={id} width={width} height={height}>
      <NodeToolbar elementId={id} />
      <div ref={anchorRef}>
        <EREntitySVG
          width={width}
          height={height}
          id={id}
          showAssessmentResults={!isDiagramModifiable}
          data={data}
        />
      </div>

      <PopoverManager anchorEl={anchorEl} elementId={id} type="ErEntity" />
    </DefaultNodeWrapper>
  )
}
