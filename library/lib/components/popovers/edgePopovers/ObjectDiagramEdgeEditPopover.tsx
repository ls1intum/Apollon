import { useReactFlow } from "@xyflow/react"
import { useReactiveEdge } from "@/hooks"
import { PopoverProps } from "../types"
import { EdgeStyleEditor } from "@/components/styleEditor"
import { CustomEdgeProps } from "@/edges"
import { useLabels } from "@/i18n/useLabels"
import { PopoverLayout } from "../PopoverLayout"

export const ObjectDiagramEdgeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const t = useLabels()
  const { updateEdgeData } = useReactFlow()
  const edge = useReactiveEdge(elementId)

  if (!edge) {
    return null
  }

  const edgeData = edge.data as CustomEdgeProps | undefined
  return (
    <PopoverLayout title={t.edge}>
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
