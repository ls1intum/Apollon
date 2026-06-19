import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@/hooks/usePopoverAnchor"
import { PetriNetPlaceSVG } from "@/components"
import { PetriNetPlaceProps } from "@/types"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { DefaultNodeWrapper, FOUR_WAY_HANDLES_PRESET } from "../wrappers"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"

export function PetriNetPlace({
  id,
  width,
  height,
  data,
}: NodeProps<Node<PetriNetPlaceProps>>) {
  const [anchorEl, anchorRef] = usePopoverAnchor()
  const isDiagramModifiable = useDiagramModifiable()

  if (!width || !height) {
    return null
  }

  return (
    <DefaultNodeWrapper
      elementId={id}
      width={width}
      height={height}
      hiddenHandles={FOUR_WAY_HANDLES_PRESET}
    >
      <NodeToolbar elementId={id} />
      <div ref={anchorRef}>
        <PetriNetPlaceSVG
          width={width}
          height={height}
          id={id}
          showAssessmentResults={!isDiagramModifiable}
          data={data}
        />
      </div>

      <PopoverManager anchorEl={anchorEl} elementId={id} type="PetriNetPlace" />
    </DefaultNodeWrapper>
  )
}
