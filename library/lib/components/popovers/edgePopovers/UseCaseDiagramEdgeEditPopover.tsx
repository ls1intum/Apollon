import { Box } from "@mui/material"
import { EdgeStyleEditor, TextField, Typography } from "@/components/ui"
import { SwapHorizIcon } from "@/components/Icon"
import { useReactFlow } from "@xyflow/react"
import { CustomEdgeProps } from "@/edges/EdgeProps"
import { useEdgePopOver, useReactiveEdge } from "@/hooks"
import { PopoverProps } from "../types"
import { EdgeTypeSelect, EdgeTypeOption } from "./EdgeTypeSelect"

const USE_CASE_EDGE_TYPE_OPTIONS: ReadonlyArray<EdgeTypeOption> = [
  { value: "UseCaseAssociation", label: "Association" },
  { value: "UseCaseInclude", label: "Include" },
  { value: "UseCaseExtend", label: "Extend" },
  { value: "UseCaseGeneralization", label: "Generalization" },
]

export const UseCaseEdgeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { getNode, updateEdgeData } = useReactFlow()

  const edge = useReactiveEdge(elementId)
  const { handleEdgeTypeChange, handleLabelChange, handleSwap } =
    useEdgePopOver(elementId)

  if (!edge) {
    return null
  }

  const edgeData = edge.data as CustomEdgeProps | undefined
  const sourceNode = getNode(edge.source)
  const targetNode = getNode(edge.target)
  const sourceName = (sourceNode?.data?.name as string) ?? "Source"
  const targetName = (targetNode?.data?.name as string) ?? "Target"

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <EdgeStyleEditor
        edgeData={edgeData}
        handleDataFieldUpdate={(key, value) =>
          updateEdgeData(elementId, { ...edge.data, [key]: value })
        }
        label="Edge Type"
        sideElements={[
          handleSwap && (
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <SwapHorizIcon
                style={{ cursor: "pointer" }}
                onClick={handleSwap}
              />
            </Box>
          ),
        ]}
      />

      <EdgeTypeSelect
        value={edge.type}
        options={USE_CASE_EDGE_TYPE_OPTIONS}
        onChange={handleEdgeTypeChange}
      />

      {/* Connection info */}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {sourceName} → {targetName}
      </Typography>

      {/* Show label input only for associations */}
      {edge.type === "UseCaseAssociation" && (
        <TextField
          label="Edge Label"
          value={edgeData?.label ?? ""}
          onChange={(e) => handleLabelChange(e.target.value)}
          size="small"
          fullWidth
          placeholder="Optional label for association"
        />
      )}
    </Box>
  )
}
