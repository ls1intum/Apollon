import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@/hooks/usePopoverAnchor"
import { DefaultNodeWrapper, NodeResizer } from "../wrappers"
import { useHandleOnResize } from "@/hooks"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { BPMNDataStoreProps } from "@/types"
import { BPMNDataStoreNodeSVG } from "@/components"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"

export function BPMNDataStore({
  id,
  width,
  height,
  data,
  parentId,
}: NodeProps<Node<BPMNDataStoreProps>>) {
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
        minWidth={60}
      />
      <div ref={anchorRef}>
        <BPMNDataStoreNodeSVG
          width={width}
          height={height}
          id={id}
          data={data}
          showAssessmentResults={!isDiagramModifiable}
        />
      </div>
      <PopoverManager anchorEl={anchorEl} elementId={id} type="BPMNDataStore" />
    </DefaultNodeWrapper>
  )
}
