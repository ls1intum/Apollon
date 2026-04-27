import { NodeProps, NodeResizer, type Node } from "@xyflow/react"
import { DefaultNodeWrapper } from "../wrappers"
import { useHandleOnResize } from "@/hooks"
import { DefaultNodeProps } from "@/types"
import { useRef } from "react"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { UseCaseActorNodeSVG } from "@/components/svgs/nodes/useCaseDiagram/UseCaseActorNodeSVG"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"

// The actor node IS resizable, but `UseCaseActorNodeSVG` draws the stick
// figure and the label at fixed pixel sizes — resizing grows the node's
// bounding box (giving the label more room to wrap / the figure room to
// breathe) without stretching the iconic figure or the label font.
//
// `minWidth` guarantees the stick figure (90px wide) never clips; `minHeight`
// leaves room for the figure (110px) + a gap + one full label line.
const ACTOR_MIN_WIDTH = 90
const ACTOR_MIN_HEIGHT = 140

export function UseCaseActor({
  id,
  width,
  height,
  data,
  parentId,
}: NodeProps<Node<DefaultNodeProps>>) {
  const svgWrapperRef = useRef<HTMLDivElement | null>(null)
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
        minWidth={ACTOR_MIN_WIDTH}
        minHeight={ACTOR_MIN_HEIGHT}
        handleStyle={{ width: 8, height: 8 }}
      />
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
