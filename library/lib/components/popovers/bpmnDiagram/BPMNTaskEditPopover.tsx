import { Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material"
import { NodeStyleEditor } from "@/components/ui"
import { useReactFlow } from "@xyflow/react"
import { PopoverProps } from "../types"
import { BPMNMarkerType, BPMNTaskProps, BPMNTaskType } from "@/types"
import { supportsMultilineName } from "@/utils/nodeUtils"

export const BPMNTaskEditPopover: React.FC<PopoverProps> = ({ elementId }) => {
  const { getNode, updateNodeData } = useReactFlow()
  const node = getNode(elementId)
  if (!node) return null

  const data = node.data as BPMNTaskProps

  const handleDataFieldUpdate = (key: string, value: string) => {
    updateNodeData(elementId, { [key]: value })
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <NodeStyleEditor
        handleDataFieldUpdate={(key, value) =>
          handleDataFieldUpdate(key, value)
        }
        nodeData={data}
        multilineName={supportsMultilineName(node.type)}
      />

      <FormControl fullWidth size="small">
        <InputLabel id="bpmn-task-type-label">Task Type</InputLabel>
        <Select
          labelId="bpmn-task-type-label"
          id="bpmn-task-type-select"
          value={data.taskType ?? "default"}
          label="Task Type"
          onChange={(e) =>
            handleDataFieldUpdate("taskType", e.target.value as BPMNTaskType)
          }
        >
          <MenuItem value="default">Default</MenuItem>
          <MenuItem value="user">User</MenuItem>
          <MenuItem value="send">Send</MenuItem>
          <MenuItem value="receive">Receive</MenuItem>
          <MenuItem value="manual">Manual</MenuItem>
          <MenuItem value="business-rule">Business Rule</MenuItem>
          <MenuItem value="script">Script</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth size="small">
        <InputLabel id="bpmn-task-marker-label">Marker</InputLabel>
        <Select
          labelId="bpmn-task-marker-label"
          id="bpmn-task-marker-select"
          value={data.marker ?? "none"}
          label="Marker"
          onChange={(e) =>
            handleDataFieldUpdate("marker", e.target.value as BPMNMarkerType)
          }
        >
          <MenuItem value="none">None</MenuItem>
          <MenuItem value="parallel multi instance">
            Parallel multi instance
          </MenuItem>
          <MenuItem value="sequential multi instance">
            Sequential multi instance
          </MenuItem>
          <MenuItem value="loop">Loop</MenuItem>
        </Select>
      </FormControl>
    </Box>
  )
}
