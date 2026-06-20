import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@/hooks/usePopoverAnchor"
import { DefaultNodeWrapper, FOUR_WAY_HANDLES_PRESET } from "../wrappers"
import { DefaultNodeProps } from "@/types"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { ComponentInterfaceNodeSVG } from "@/components"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"
import { useDiagramStore } from "@/store"
import { computeInterfaceLabelSide } from "@/utils/geometry/interfaceLabelLayout"

export function ComponentInterface({
  id,
  width,
  height,
  data,
}: NodeProps<Node<DefaultNodeProps>>) {
  const [anchorEl, anchorRef] = usePopoverAnchor()
  const isDiagramModifiable = useDiagramModifiable()
  const showAssessmentResults = !isDiagramModifiable
  // Move the name off any side a connecting edge attaches to. A primitive-
  // returning selector re-renders the node only when the chosen side flips.
  const labelSide = useDiagramStore((state) =>
    computeInterfaceLabelSide(state.edges, id, {
      badgeTopRight: showAssessmentResults,
    })
  )

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

      <div ref={anchorRef}>
        <ComponentInterfaceNodeSVG
          width={width}
          height={height}
          data={data}
          id={id}
          showAssessmentResults={showAssessmentResults}
          labelSide={labelSide}
        />
      </div>

      <PopoverManager anchorEl={anchorEl} elementId={id} type="default" />
    </DefaultNodeWrapper>
  )
}
