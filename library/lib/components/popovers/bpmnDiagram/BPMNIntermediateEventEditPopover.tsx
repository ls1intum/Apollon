import { Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material"
import { useReactiveNode } from "@/hooks"
import { useReactFlow } from "@xyflow/react"
import { PopoverProps } from "../types"
import { BPMNIntermediateEventType } from "@/types"
import { TextField } from "@/components/ui"

export const BPMNIntermediateEventEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { updateNodeData } = useReactFlow()
  const node = useReactiveNode(elementId)
  if (!node) return null

  const data = node.data as {
    name?: string
    eventType?: BPMNIntermediateEventType
  }

  const handleNameChange = (value: string) =>
    updateNodeData(elementId, { name: value })
  const handleTypeChange = (value: BPMNIntermediateEventType) =>
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
        <InputLabel id="bpmn-intermediate-type-label">
          Intermediate Type
        </InputLabel>
        <Select
          labelId="bpmn-intermediate-type-label"
          id="bpmn-intermediate-type-select"
          value={data.eventType ?? "default"}
          label="Intermediate Type"
          onChange={(e) =>
            handleTypeChange(e.target.value as BPMNIntermediateEventType)
          }
        >
          <MenuItem value="default">Default</MenuItem>
          <MenuItem value="message-catch">Message Catch</MenuItem>
          <MenuItem value="message-throw">Message Throw</MenuItem>
          <MenuItem value="timer-catch">Timer Catch</MenuItem>
          <MenuItem value="escalation-throw">Escalation Throw</MenuItem>
          <MenuItem value="conditional-catch">Conditional Catch</MenuItem>
          <MenuItem value="link-catch">Link Catch</MenuItem>
          <MenuItem value="link-throw">Link Throw</MenuItem>
          <MenuItem value="compensation-throw">Compensation Throw</MenuItem>
          <MenuItem value="signal-catch">Signal Catch</MenuItem>
          <MenuItem value="signal-throw">Signal Throw</MenuItem>
        </Select>
      </FormControl>
    </Box>
  )
}
