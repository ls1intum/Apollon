import { Box } from "@mui/material"
import { EdgeStyleEditor, TextField } from "@/components/ui"
import { useReactFlow } from "@xyflow/react"
import { CustomEdgeProps } from "@/edges/EdgeProps"
import { useEdgePopOver, useReactiveEdge } from "@/hooks"
import { PopoverProps } from "../types"
import { SwapEndsButton } from "./SwapEndsButton"

export const PetriNetEdgeEditPopover: React.FC<PopoverProps> = ({
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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <EdgeStyleEditor
        edgeData={edgeData}
        handleDataFieldUpdate={(key, value) =>
          updateEdgeData(elementId, { ...edge.data, [key]: value })
        }
        label="Petri Net Arc"
        sideElements={[handleSwap && <SwapEndsButton onClick={handleSwap} />]}
      />

      {/* Label update */}
      <TextField
        value={edgeData?.label ?? ""}
        onChange={(e) => {
          const value = e.target.value
          handleLabelChange(value)
        }}
        size="small"
        fullWidth
      />
    </Box>
  )
}
