import { NodeProps, type Node } from "@xyflow/react"
import { DefaultNodeWrapper, FOUR_WAY_HANDLES_PRESET } from "../wrappers"
import { DefaultNodeProps } from "@/types"
import { useRef } from "react"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { ComponentInterfaceNodeSVG } from "@/components"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"

export function ComponentInterface({
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
    <DefaultNodeWrapper
      width={width}
      height={height}
      elementId={id}
      hiddenHandles={FOUR_WAY_HANDLES_PRESET}
    >
      <NodeToolbar elementId={id} />

      <div ref={svgWrapperRef}>
        <ComponentInterfaceNodeSVG
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
