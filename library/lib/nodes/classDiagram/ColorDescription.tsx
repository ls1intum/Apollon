import { NodeProps, NodeResizer, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@/hooks/usePopoverAnchor"
import { DefaultNodeWrapper } from "../wrappers"
import { ColorDescriptionSVG } from "@/components"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"
import { DefaultNodeProps } from "@/types"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"

export function ColorDescription({
  width,
  height,
  data,
  id,
}: NodeProps<Node<DefaultNodeProps>>) {
  const [anchorEl, anchorRef] = usePopoverAnchor()
  const isDiagramModifiable = useDiagramModifiable()
  if (!width || !height) {
    return null
  }

  return (
    <DefaultNodeWrapper
      width={width}
      height={height}
      elementId={id}
      hiddenHandles={true}
    >
      <NodeToolbar elementId={id} />
      <NodeResizer minHeight={40} isVisible={isDiagramModifiable} />

      <div ref={anchorRef}>
        <ColorDescriptionSVG data={data} width={width} height={height} />
      </div>
      <PopoverManager elementId={id} type="default" anchorEl={anchorEl} />
    </DefaultNodeWrapper>
  )
}
