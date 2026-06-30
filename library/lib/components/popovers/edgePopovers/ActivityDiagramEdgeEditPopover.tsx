import { IconButton, TextField } from "@/components/ui"
import { EdgeStyleEditor } from "@/components/styleEditor"
import { useReactFlow } from "@xyflow/react"
import { CustomEdgeProps } from "@/edges/EdgeProps"
import { ArrowLeftRight } from "lucide-react"
import { useEdgePopOver, useReactiveEdge } from "@/hooks"
import { PopoverProps } from "../types"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"

export const ActivityDiagramEdgeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { updateEdgeData } = useReactFlow()
  const edge = useReactiveEdge(elementId)

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
              key="swap-source-target"
              ariaLabel="Swap source and target"
              tooltip="Swap source and target"
              onClick={handleSwap}
            >
              <ArrowLeftRight width={16} height={16} aria-hidden="true" />
            </IconButton>
          ),
        ]}
      />

      <PopoverSection title="Label" divider>
        <TextField
          value={edgeData?.label ?? ""}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Label"
          fullWidth
        />
      </PopoverSection>
    </PopoverLayout>
  )
}
