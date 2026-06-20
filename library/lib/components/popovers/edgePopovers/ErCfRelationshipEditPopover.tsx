import { Box, FormControlLabel, MenuItem, Select, Switch } from "@mui/material"
import { EdgeStyleEditor, TextField, Typography } from "@/components/ui"
import { useReactFlow } from "@xyflow/react"
import { CustomEdgeProps } from "@/edges/EdgeProps"
import {
  DEFAULT_ER_CF_SOURCE_CARDINALITY,
  DEFAULT_ER_CF_TARGET_CARDINALITY,
  ErCfCardinality,
} from "@/types/nodes/enums/EntityRelationshipType"
import { useEdgePopOver, useReactiveEdge } from "@/hooks"
import { PopoverProps } from "../types"
import { SwapEndsButton } from "./SwapEndsButton"

const CARDINALITIES: { value: ErCfCardinality; label: string }[] = [
  { value: "ExactlyOne", label: "Exactly one (1)" },
  { value: "ZeroOrOne", label: "Zero or one (0..1)" },
  { value: "OneOrMany", label: "One or many (1..*)" },
  { value: "ZeroOrMany", label: "Zero or many (0..*)" },
]

export const ErCfRelationshipEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { updateEdgeData } = useReactFlow()
  const edge = useReactiveEdge(elementId)
  const { handleSwap } = useEdgePopOver(elementId)

  if (!edge) {
    return null
  }
  const edgeData = edge.data as CustomEdgeProps | undefined
  const patch = (fields: Partial<CustomEdgeProps>) =>
    updateEdgeData(elementId, { ...edge.data, ...fields })

  const cardinalitySelect = (
    label: string,
    value: ErCfCardinality,
    onChange: (c: ErCfCardinality) => void
  ) => (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
        {label}
      </Typography>
      <Select
        size="small"
        fullWidth
        value={value}
        onChange={(e) => onChange(e.target.value as ErCfCardinality)}
      >
        {CARDINALITIES.map((c) => (
          <MenuItem key={c.value} value={c.value}>
            {c.label}
          </MenuItem>
        ))}
      </Select>
    </Box>
  )

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <EdgeStyleEditor
        edgeData={edgeData}
        handleDataFieldUpdate={(key, value) => patch({ [key]: value })}
        label="Relationship"
        sideElements={[handleSwap && <SwapEndsButton onClick={handleSwap} />]}
      />

      <TextField
        label="Label"
        value={edgeData?.label ?? ""}
        onChange={(e) => patch({ label: e.target.value })}
        size="small"
        fullWidth
        slotProps={{ htmlInput: { "data-testid": "er-cf-label" } }}
      />

      {cardinalitySelect(
        "Source cardinality",
        edgeData?.sourceCardinality ?? DEFAULT_ER_CF_SOURCE_CARDINALITY,
        (c) => patch({ sourceCardinality: c })
      )}
      {cardinalitySelect(
        "Target cardinality",
        edgeData?.targetCardinality ?? DEFAULT_ER_CF_TARGET_CARDINALITY,
        (c) => patch({ targetCardinality: c })
      )}

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={edgeData?.identifying !== false}
            onChange={(e) => patch({ identifying: e.target.checked })}
          />
        }
        label="Identifying (solid line)"
      />
    </Box>
  )
}
