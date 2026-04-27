import { NodeProps, type Node } from "@xyflow/react"
import { DefaultNodeWrapper } from "../wrappers"
import { useRef } from "react"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { DefaultNodeProps } from "@/types"
import { SfcStartNodeSVG } from "@/components"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"
import { PopoverManager } from "@/components/popovers/PopoverManager"

export function SfcStart({
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
      <NodeToolbar elementId={id} showEdit={false} />

      <div ref={svgWrapperRef}>
        <SfcStartNodeSVG
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
