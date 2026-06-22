import { Box } from "@mui/material"
import { EdgeStyleEditor, TextField, Typography } from "@/components/ui"
import { useReactFlow } from "@xyflow/react"
import { CustomEdgeProps } from "@/edges/EdgeProps"
import { useEdgePopOver, useReactiveEdge, useReactiveNodeName } from "@/hooks"
import { PopoverProps } from "../types"
import { EdgeTypeSelect, EdgeTypeOption } from "./EdgeTypeSelect"
import { SwapEndsButton } from "./SwapEndsButton"

const CLASS_EDGE_TYPE_OPTIONS: ReadonlyArray<EdgeTypeOption> = [
  { value: "ClassBidirectional", label: "Bi-Association" },
  { value: "ClassUnidirectional", label: "Uni-Association" },
  { value: "ClassAggregation", label: "Aggregation" },
  { value: "ClassComposition", label: "Composition" },
  { value: "ClassInheritance", label: "Inheritance" },
  { value: "ClassDependency", label: "Dependency" },
  { value: "ClassRealization", label: "Realization" },
]

export const EdgeEditPopover: React.FC<PopoverProps> = ({ elementId }) => {
  const { updateEdgeData } = useReactFlow()

  // Subscribe reactively to the edge and its endpoint names so the popover
  // reflects live changes (swap, collaboration). Reading getEdge/getNode
  // imperatively during render is non-reactive and goes stale once the React
  // Compiler memoizes this component.
  const edge = useReactiveEdge(elementId)
  const sourceName = useReactiveNodeName(edge?.source, "Source")
  const targetName = useReactiveNodeName(edge?.target, "Target")

  const {
    handleSourceRoleChange,
    handleSourceMultiplicityChange,
    handleTargetRoleChange,
    handleTargetMultiplicityChange,
    handleEdgeTypeChange,
    handleSwap,
  } = useEdgePopOver(elementId)

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
        options={CLASS_EDGE_TYPE_OPTIONS}
        onChange={handleEdgeTypeChange}
      />

      {
        <>
          {/* Source subheadline */}
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            {sourceName}
          </Typography>

          {/* Source Multiplicity */}
          <TextField
            label={sourceName + " Multiplicity"}
            value={edgeData?.sourceMultiplicity ?? ""}
            onChange={(e) => handleSourceMultiplicityChange(e.target.value)}
            size="small"
            fullWidth
            slotProps={{
              htmlInput: { "data-testid": "edge-source-multiplicity" },
            }}
          />

          {/* Source Role */}
          <TextField
            label={sourceName + " Role"}
            value={edgeData?.sourceRole ?? ""}
            onChange={(e) => handleSourceRoleChange(e.target.value)}
            size="small"
            fullWidth
            slotProps={{ htmlInput: { "data-testid": "edge-source-role" } }}
          />

          {/* Target subheadline */}
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            {targetName}
          </Typography>

          {/* Target Multiplicity */}
          <TextField
            label={targetName + " Multiplicity"}
            value={edgeData?.targetMultiplicity ?? ""}
            onChange={(e) => handleTargetMultiplicityChange(e.target.value)}
            size="small"
            fullWidth
            slotProps={{
              htmlInput: { "data-testid": "edge-target-multiplicity" },
            }}
          />

          {/* Target Role */}
          <TextField
            label={targetName + " Role"}
            value={edgeData?.targetRole ?? ""}
            onChange={(e) => handleTargetRoleChange(e.target.value)}
            size="small"
            fullWidth
            slotProps={{ htmlInput: { "data-testid": "edge-target-role" } }}
          />
        </>
      }
    </Box>
  )
}
