import { useReactiveNode } from "@/hooks"
import { useReactFlow } from "@xyflow/react"
import { PopoverProps } from "../types"
import { BPMNEndEventType } from "@/types"
import { Select, TextField } from "@/components/ui"
import { PopoverLayout } from "../PopoverLayout"

const END_TYPE_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "message", label: "Message" },
  { value: "escalation", label: "Escalation" },
  { value: "error", label: "Error" },
  { value: "compensation", label: "Compensation" },
  { value: "signal", label: "Signal" },
  { value: "terminate", label: "Terminate" },
]

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
    <PopoverLayout title="End Event">
      <TextField
        label="Name"
        value={data.name ?? ""}
        onChange={(e) => handleNameChange(e.target.value)}
        fullWidth
      />
      <Select
        label="End Type"
        value={data.eventType ?? "default"}
        options={END_TYPE_OPTIONS}
        onChange={(value) => handleTypeChange(value as BPMNEndEventType)}
      />
    </PopoverLayout>
  )
}
