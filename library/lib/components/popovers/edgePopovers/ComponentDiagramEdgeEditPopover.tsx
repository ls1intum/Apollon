import { Box } from "@mui/material"
import { EdgeStyleEditor, Typography } from "@/components/ui"
import { useReactFlow } from "@xyflow/react"
import { useEdgePopOver, useReactiveEdge, useReactiveNodeName } from "@/hooks"
import { PopoverProps } from "../types"
import { CustomEdgeProps } from "@/edges"
import { EdgeTypeSelect, EdgeTypeOption } from "./EdgeTypeSelect"
import { SwapEndsButton } from "./SwapEndsButton"

const COMPONENT_EDGE_TYPE_OPTIONS: ReadonlyArray<EdgeTypeOption> = [
  { value: "ComponentDependency", label: "Dependency" },
  { value: "ComponentProvidedInterface", label: "Provided Interface" },
  { value: "ComponentRequiredInterface", label: "Required Interface" },
]

export const ComponentEdgeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { updateEdgeData } = useReactFlow()

  const edge = useReactiveEdge(elementId)
  const sourceName = useReactiveNodeName(edge?.source, "Source")
  const targetName = useReactiveNodeName(edge?.target, "Target")
  const { handleEdgeTypeChange, handleSwap } = useEdgePopOver(elementId)

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
        options={COMPONENT_EDGE_TYPE_OPTIONS}
        onChange={handleEdgeTypeChange}
      />

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {sourceName} → {targetName}
      </Typography>
    </Box>
  )
}
