import { NodeProps, type Node } from "@xyflow/react"
import { DefaultNodeWrapper, FOUR_WAY_HANDLES_PRESET } from "../wrappers"
import { useRef } from "react"
import { SfcTransitionBranchNodeProps } from "@/types"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"
import { SfcTransitionBranchNodeSVG } from "@/components/"

export function SfcTransitionBranch({
  id,
  width,
  height,
  data,
}: NodeProps<Node<SfcTransitionBranchNodeProps>>) {
  const svgWrapperRef = useRef<HTMLDivElement | null>(null)

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
        <SfcTransitionBranchNodeSVG
          width={width}
          height={height}
          data={data}
          id={id}
        />
      </div>
    </DefaultNodeWrapper>
  )
}
