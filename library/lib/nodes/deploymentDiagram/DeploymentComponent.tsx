import { NodeProps, NodeResizer, type Node } from "@xyflow/react"
import { DefaultNodeWrapper } from "../wrappers"
import { useHandleOnResize } from "@/hooks"
import { DeploymentComponentProps } from "@/types"
import { useRef } from "react"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { DeploymentComponentSVG } from "@/components"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"

export function DeploymentComponent({
  id,
  width,
  height,
  data,
  parentId,
}: NodeProps<Node<DeploymentComponentProps>>) {
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
        minHeight={50}
        minWidth={50}
        handleStyle={{ width: 8, height: 8 }}
      />
      <div ref={svgWrapperRef}>
        <DeploymentComponentSVG
          width={width}
          height={height}
          id={id}
          showAssessmentResults={!isDiagramModifiable}
          data={data}
        />
      </div>

      <PopoverManager
        anchorEl={svgWrapperRef.current}
        elementId={id}
        type="DeploymentComponent"
      />
    </DefaultNodeWrapper>
  )
}
