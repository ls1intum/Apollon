import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@/hooks/usePopoverAnchor"
import {
  DefaultNodeWrapper,
  FOUR_WAY_HANDLES_PRESET,
  NodeResizer,
} from "../wrappers"
import { useHandleOnResize } from "@/hooks"
import { DefaultNodeProps } from "@/types"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { FlowchartDecisionNodeSVG } from "@/components"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"

export function FlowchartDecision({
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
    <DefaultNodeWrapper
      width={width}
      height={height}
      elementId={id}
      hiddenHandles={FOUR_WAY_HANDLES_PRESET}
    >
      <NodeToolbar elementId={id} />
      <NodeResizer
        isVisible={isDiagramModifiable}
        onResize={onResize}
        minHeight={50}
        minWidth={50}
      />
      <div ref={anchorRef}>
        <FlowchartDecisionNodeSVG
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
        type="FlowchartDecision"
      />
    </DefaultNodeWrapper>
  )
}
