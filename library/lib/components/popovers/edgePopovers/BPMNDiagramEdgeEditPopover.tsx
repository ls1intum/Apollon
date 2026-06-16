import { Box } from "@mui/material"
import { CustomEdgeProps } from "@/edges/EdgeProps"
import { useReactFlow } from "@xyflow/react"
import { useEdgePopOver, useReactiveEdge, useReactiveNodeName } from "@/hooks"
import { PopoverProps } from "../types"
import { EdgeStyleEditor, TextField, Typography } from "@/components/ui"
import { EdgeTypeSelect, EdgeTypeOption } from "./EdgeTypeSelect"
import { SwapEndsButton } from "./SwapEndsButton"

const BPMN_EDGE_TYPE_OPTIONS: ReadonlyArray<EdgeTypeOption> = [
  { value: "BPMNSequenceFlow", label: "Sequence Flow" },
  { value: "BPMNMessageFlow", label: "Message Flow" },
  { value: "BPMNAssociationFlow", label: "Association Flow" },
  { value: "BPMNDataAssociationFlow", label: "Data Association Flow" },
]

export const BPMNDiagramEdgeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { updateEdgeData } = useReactFlow()

  const edge = useReactiveEdge(elementId)
  const sourceName = useReactiveNodeName(edge?.source, "Source")
  const targetName = useReactiveNodeName(edge?.target, "Target")
  const { handleEdgeTypeChange, handleSwap, handleLabelChange } =
    useEdgePopOver(elementId)

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
        label="Control Flow"
        sideElements={[handleSwap && <SwapEndsButton onClick={handleSwap} />]}
      />
      <EdgeTypeSelect
        value={edge.type}
        options={BPMN_EDGE_TYPE_OPTIONS}
        onChange={handleEdgeTypeChange}
      />

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {sourceName} → {targetName}
      </Typography>
      {/* Label update */}
      <TextField
        value={edgeData?.label ?? ""}
        onChange={(e) => handleLabelChange(e.target.value)}
        size="small"
        fullWidth
      />
    </Box>
  )
}
