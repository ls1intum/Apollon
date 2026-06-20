import { NodeProps, NodeResizer, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@/hooks/usePopoverAnchor"
import { DefaultNodeWrapper } from "../wrappers"
import { useHandleOnResize } from "@/hooks"
import { DefaultNodeProps } from "@/types"
import { FlowchartInputOutputNodeSVG } from "@/components"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { PopoverManager } from "@/components/popovers/PopoverManager"

export function FlowchartInputOutput({
  id,
  width,
  height,
  data,
  parentId,
}: NodeProps<Node<DefaultNodeProps>>) {
  const [anchorEl, anchorRef] = usePopoverAnchor()
  const { onResize } = useHandleOnResize(parentId)
  const isDiagramModifiable = useDiagramModifiable()

  if (!width || !height) {
    return null
  }

  return (
    <DefaultNodeWrapper elementId={id}>
      <NodeToolbar elementId={id} />

      <NodeResizer
        isVisible={isDiagramModifiable}
        onResize={onResize}
        minHeight={50}
        minWidth={50}
        handleStyle={{ width: 8, height: 8 }}
      />
      <div ref={anchorRef}>
        <FlowchartInputOutputNodeSVG
          width={width}
          height={height}
          id={id}
          showAssessmentResults={!isDiagramModifiable}
          data={data}
        />
      </div>

      <PopoverManager
        anchorEl={anchorEl}
        elementId={id}
        type="FlowchartInputOutput"
      />
    </DefaultNodeWrapper>
  )
}
