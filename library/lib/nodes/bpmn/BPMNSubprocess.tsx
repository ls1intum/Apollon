import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@/hooks/usePopoverAnchor"
import { DefaultNodeWrapper, NodeResizer } from "../wrappers"
import { useHandleOnResize } from "@/hooks"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { BPMNSubprocessProps } from "@/types"
import { BPMNSubprocessNodeSVG } from "@/components"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"

export function BPMNSubprocess({
  id,
  width,
  height,
  data,
  parentId,
}: NodeProps<Node<BPMNSubprocessProps>>) {
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
        minHeight={60}
        minWidth={80}
      />
      <div ref={anchorRef}>
        <BPMNSubprocessNodeSVG
          width={width}
          height={height}
          id={id}
          data={data}
          showAssessmentResults={!isDiagramModifiable}
        />
      </div>
      <PopoverManager
        anchorEl={anchorEl}
        elementId={id}
        type="BPMNSubprocess"
      />
    </DefaultNodeWrapper>
  )
}
