import { NodeProps, type Node } from "@xyflow/react"
import { DefaultNodeWrapper } from "../wrappers"
import { DefaultNodeProps } from "@/types"
import { useRef } from "react"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { UseCaseActorNodeSVG } from "@/components/svgs/nodes/useCaseDiagram/UseCaseActorNodeSVG"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"

// Actors are iconic figures in UML use-case diagrams — fixed proportions,
// fixed size. Matches the conventions of StarUML / Visual Paradigm / yEd:
// resizing the stick-figure-plus-label is not a meaningful affordance, and
// allowing it has caused labels to scale up into neighboring content.
export function UseCaseActor({
  id,
  width,
  height,
  data,
}: NodeProps<Node<DefaultNodeProps>>) {
  const svgWrapperRef = useRef<HTMLDivElement | null>(null)
  const isDiagramModifiable = useDiagramModifiable()

  if (!width || !height) {
    return null
  }

  return (
    <DefaultNodeWrapper width={width} height={height} elementId={id}>
      <NodeToolbar elementId={id} />
      <div ref={svgWrapperRef}>
        <UseCaseActorNodeSVG
          width={width}
          height={height}
          data={data}
          id={id}
          showAssessmentResults={!isDiagramModifiable}
        />
      </div>

      <PopoverManager
        anchorEl={svgWrapperRef.current}
        elementId={id}
        type="default"
      />
    </DefaultNodeWrapper>
  )
}
