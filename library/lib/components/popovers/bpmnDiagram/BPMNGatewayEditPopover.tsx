import { Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material"
import { useReactiveNode } from "@/hooks"
import { useReactFlow } from "@xyflow/react"
import { PopoverProps } from "../types"
import { BPMNGatewayType } from "@/types"
import { TextField } from "@/components/ui"

export const BPMNGatewayEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { updateNodeData } = useReactFlow()
  const node = useReactiveNode(elementId)
  if (!node) return null

  const data = node.data as { name?: string; gatewayType?: BPMNGatewayType }

  const handleNameChange = (value: string) =>
    updateNodeData(elementId, { name: value })
  const handleTypeChange = (value: BPMNGatewayType) =>
    updateNodeData(elementId, { gatewayType: value })

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <TextField
        size="small"
        label="Name"
        value={data.name ?? ""}
        onChange={(e) => handleNameChange(e.target.value)}
      />
      <FormControl fullWidth size="small">
        <InputLabel id="bpmn-gateway-type-label">Gateway Type</InputLabel>
        <Select
          labelId="bpmn-gateway-type-label"
          id="bpmn-gateway-type-select"
          value={data.gatewayType ?? "exclusive"}
          label="Gateway Type"
          onChange={(e) => handleTypeChange(e.target.value as BPMNGatewayType)}
        >
          <MenuItem value="exclusive">Exclusive</MenuItem>
          <MenuItem value="parallel">Parallel</MenuItem>
          <MenuItem value="inclusive">Inclusive</MenuItem>
          <MenuItem value="event-based">Event-based</MenuItem>
          <MenuItem value="complex">Complex</MenuItem>
        </Select>
      </FormControl>
    </Box>
  )
}
