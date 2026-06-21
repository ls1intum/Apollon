import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material"
import { EdgeStyleEditor, TextField, Typography } from "@/components/ui"
import { useReactFlow } from "@xyflow/react"
import { CustomEdgeProps } from "@/edges/EdgeProps"
import { useEdgePopOver, useReactiveEdge } from "@/hooks"
import { PopoverProps } from "../types"
import { SwapEndsButton } from "./SwapEndsButton"

// Quick presets for both common notations. Chen ratio (1/N/M) and Merise
// (min,max) coexist per-edge — the value is free text, these are just shortcuts.
const CARDINALITY_PRESETS = ["1", "N", "M", "(0,1)", "(1,1)", "(0,N)", "(1,N)"]

export const ErDiagramEdgeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { updateEdgeData } = useReactFlow()
  const edge = useReactiveEdge(elementId)
  const { handleSwap } = useEdgePopOver(elementId)

  if (!edge) {
    return null
  }

  const edgeData = edge.data as CustomEdgeProps | undefined
  const isConnector = edge.type === "ErConnector"

  const patch = (fields: Partial<CustomEdgeProps>) =>
    updateEdgeData(elementId, { ...edge.data, ...fields })

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <EdgeStyleEditor
        edgeData={edgeData}
        handleDataFieldUpdate={(key, value) => patch({ [key]: value })}
        label={isConnector ? "Connector" : "Link"}
        sideElements={[handleSwap && <SwapEndsButton onClick={handleSwap} />]}
      />

      {isConnector && (
        <>
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            Cardinality
          </Typography>
          <TextField
            value={edgeData?.cardinality ?? ""}
            onChange={(e) => patch({ cardinality: e.target.value })}
            size="small"
            fullWidth
            slotProps={{ htmlInput: { "data-testid": "er-cardinality" } }}
          />
          <ToggleButtonGroup
            size="small"
            value={edgeData?.cardinality ?? null}
            exclusive
            onChange={(_, value: string | null) =>
              value && patch({ cardinality: value })
            }
            sx={{ flexWrap: "wrap" }}
          >
            {CARDINALITY_PRESETS.map((preset) => (
              <ToggleButton key={preset} value={preset}>
                {preset}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            Participation
          </Typography>
          <ToggleButtonGroup
            size="small"
            value={edgeData?.participation ?? "partial"}
            exclusive
            onChange={(_, value: "partial" | "total" | null) =>
              value && patch({ participation: value })
            }
          >
            <ToggleButton value="partial">Partial</ToggleButton>
            <ToggleButton value="total">Total</ToggleButton>
          </ToggleButtonGroup>
        </>
      )}
    </Box>
  )
}
