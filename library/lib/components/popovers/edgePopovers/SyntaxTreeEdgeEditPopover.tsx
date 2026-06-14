import { useReactFlow } from "@xyflow/react"
import { PopoverProps } from "../types"
import { EdgeStyleEditor } from "@/components/ui"
import { CustomEdgeProps } from "@/edges"
import { PopoverLayout } from "../PopoverLayout"

export const SyntaxTreeEdgeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { getEdge, updateEdgeData } = useReactFlow()
  const edge = getEdge(elementId)

  if (!edge) {
    return null
  }

  const edgeData = edge.data as CustomEdgeProps | undefined
  return (
    <PopoverLayout title="Edge">
      <EdgeStyleEditor
        edgeData={edgeData}
        handleDataFieldUpdate={(key, value) =>
          updateEdgeData(elementId, { ...edge.data, [key]: value })
        }
        label="Style"
      />
    </PopoverLayout>
  )
}
