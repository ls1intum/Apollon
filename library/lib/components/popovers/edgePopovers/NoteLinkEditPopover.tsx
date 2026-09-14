import { useReactFlow } from "@xyflow/react"
import { useReactiveEdge } from "@/hooks"
import { PopoverProps } from "../types"
import { EdgeStyleEditor } from "@/components/styleEditor"
import { CustomEdgeProps } from "@/edges"
import { useLabels } from "@/i18n/useLabels"
import { PopoverLayout } from "../PopoverLayout"

/**
 * A note anchor has nothing to configure but its stroke: it carries no label,
 * no multiplicity and no direction, and there is no other kind of note anchor
 * to switch it to.
 */
export const NoteLinkEditPopover: React.FC<PopoverProps> = ({ elementId }) => {
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
        label={t.style}
      />
    </PopoverLayout>
  )
}
