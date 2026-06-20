import { Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material"
import { useReactiveNode } from "@/hooks"
import { useReactFlow } from "@xyflow/react"
import { PopoverProps } from "../types"
import { BPMNEndEventType } from "@/types"
import { TextField } from "@/components/ui"

export const BPMNEndEventEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { updateNodeData } = useReactFlow()
  const node = useReactiveNode(elementId)
  if (!node) return null

  const data = node.data as { name?: string; eventType?: BPMNEndEventType }

  const handleNameChange = (value: string) =>
    updateNodeData(elementId, { name: value })
  const handleTypeChange = (value: BPMNEndEventType) =>
    updateNodeData(elementId, { eventType: value })

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <TextField
        size="small"
        label="Name"
        value={data.name ?? ""}
        onChange={(e) => handleNameChange(e.target.value)}
      />
      <FormControl fullWidth size="small">
        <InputLabel id="bpmn-end-type-label">End Type</InputLabel>
        <Select
          labelId="bpmn-end-type-label"
          id="bpmn-end-type-select"
          value={data.eventType ?? "default"}
          label="End Type"
          onChange={(e) => handleTypeChange(e.target.value as BPMNEndEventType)}
        >
          <MenuItem value="default">Default</MenuItem>
          <MenuItem value="message">Message</MenuItem>
          <MenuItem value="escalation">Escalation</MenuItem>
          <MenuItem value="error">Error</MenuItem>
          <MenuItem value="compensation">Compensation</MenuItem>
          <MenuItem value="signal">Signal</MenuItem>
          <MenuItem value="terminate">Terminate</MenuItem>
        </Select>
      </FormControl>
    </Box>
  )
}
