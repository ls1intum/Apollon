import { Box } from "@mui/material"
import { EdgeStyleEditor, TextField, Typography } from "@/components/ui"
import { useReactFlow } from "@xyflow/react"
import { CustomEdgeProps } from "@/edges/EdgeProps"
import { useEdgePopOver, useReactiveEdge, useReactiveNodeName } from "@/hooks"
import { PopoverProps } from "../types"
import { EdgeTypeSelect, EdgeTypeOption } from "./EdgeTypeSelect"
import { SwapEndsButton } from "./SwapEndsButton"

const DEPLOYMENT_EDGE_TYPE_OPTIONS: ReadonlyArray<EdgeTypeOption> = [
  { value: "DeploymentAssociation", label: "Deployment Association" },
  { value: "DeploymentDependency", label: "Deployment Dependency" },
  { value: "DeploymentProvidedInterface", label: "Provided Interface" },
  { value: "DeploymentRequiredInterface", label: "Required Interface" },
]

export const DeploymentEdgeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { updateEdgeData } = useReactFlow()

  const edge = useReactiveEdge(elementId)
  const sourceName = useReactiveNodeName(edge?.source, "Source")
  const targetName = useReactiveNodeName(edge?.target, "Target")
  const { handleEdgeTypeChange, handleLabelChange, handleSwap } =
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
        label="Edge Type"
        sideElements={[handleSwap && <SwapEndsButton onClick={handleSwap} />]}
      />
      <EdgeTypeSelect
        value={edge.type}
        options={DEPLOYMENT_EDGE_TYPE_OPTIONS}
        onChange={handleEdgeTypeChange}
      />

      {/* Connection info */}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {sourceName} → {targetName}
      </Typography>

      {/* Show label input only for associations */}
      {edge.type === "DeploymentAssociation" && (
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
