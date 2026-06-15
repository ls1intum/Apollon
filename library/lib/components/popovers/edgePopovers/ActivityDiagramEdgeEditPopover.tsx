import { EdgeStyleEditor, IconButton, TextField } from "@/components/ui"
import { useReactFlow } from "@xyflow/react"
import { CustomEdgeProps } from "@/edges/EdgeProps"
import { ArrowLeftRight } from "lucide-react"
import { useEdgePopOver } from "@/hooks"
import { PopoverProps } from "../types"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"

export const ActivityDiagramEdgeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { getEdge, updateEdgeData } = useReactFlow()
  const edge = getEdge(elementId)

  const { handleLabelChange, handleSwap } = useEdgePopOver(elementId)

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
        sideElements={[
          handleSwap && (
            <IconButton
              ariaLabel="Swap edge direction"
              tooltip="Swap edge direction"
              onClick={handleSwap}
            >
              <ArrowLeftRight width={16} height={16} aria-hidden="true" />
            </IconButton>
          ),
        ]}
      />

      <PopoverSection divider>
        <TextField
          value={edgeData?.label ?? ""}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Label"
          size="small"
          fullWidth
        />
      </PopoverSection>
    </PopoverLayout>
  )
}
