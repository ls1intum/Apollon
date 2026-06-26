import { useReactiveNode } from "@/hooks"
import { useReactFlow } from "@xyflow/react"
import { PopoverProps } from "../types"
import { BPMNStartEventType } from "@/types"
import { Select, TextField } from "@/components/ui"
import { PopoverLayout } from "../PopoverLayout"

const START_TYPE_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "message", label: "Message" },
  { value: "timer", label: "Timer" },
  { value: "conditional", label: "Conditional" },
  { value: "signal", label: "Signal" },
]

export const BPMNStartEventEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { updateNodeData } = useReactFlow()
  const node = useReactiveNode(elementId)
  if (!node) return null

  const data = node.data as { name?: string; eventType?: BPMNStartEventType }

  const handleNameChange = (value: string) =>
    updateNodeData(elementId, { name: value })
  const handleTypeChange = (value: BPMNStartEventType) =>
    updateNodeData(elementId, { eventType: value })

  return (
    <PopoverLayout title="Start Event">
      <TextField
        label="Name"
        value={data.name ?? ""}
        onChange={(e) => handleNameChange(e.target.value)}
        fullWidth
      />
      <Select
        label="Start Type"
        value={data.eventType ?? "default"}
        options={START_TYPE_OPTIONS}
        onChange={(value) => handleTypeChange(value as BPMNStartEventType)}
      />
    </PopoverLayout>
  )
}
