import { NodeProps, type Node } from "@xyflow/react"
import { DefaultNodeWrapper, NodeResizer } from "@/nodes/wrappers"
import { TitleAndDescriptionSVG } from "@/components"

type Props = Node<{
  description?: string
  title: string
}>

export function TitleAndDesctiption({
  width,
  height,
  id,
  data: { description, title },
}: NodeProps<Props>) {
  if (!width || !height) {
    return null
  }

  return (
    <DefaultNodeWrapper
      width={width}
      height={height}
      elementId={id}
      hiddenHandles={true}
    >
      <TitleAndDescriptionSVG
        width={width}
        height={height}
        title={title}
        description={description || ""}
      />
      <NodeResizer isVisible minHeight={200} />
    </DefaultNodeWrapper>
  )
}
