import { useReactiveNode } from "@/hooks"
import { useReactFlow } from "@xyflow/react"
import { PopoverProps } from "../types"
import { BPMNIntermediateEventType } from "@/types"
import { Select, TextField } from "@/components/ui"
import { PopoverLayout } from "../PopoverLayout"

const INTERMEDIATE_TYPE_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "message-catch", label: "Message Catch" },
  { value: "message-throw", label: "Message Throw" },
  { value: "timer-catch", label: "Timer Catch" },
  { value: "escalation-throw", label: "Escalation Throw" },
  { value: "conditional-catch", label: "Conditional Catch" },
  { value: "link-catch", label: "Link Catch" },
  { value: "link-throw", label: "Link Throw" },
  { value: "compensation-throw", label: "Compensation Throw" },
  { value: "signal-catch", label: "Signal Catch" },
  { value: "signal-throw", label: "Signal Throw" },
]

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
    <PopoverLayout title="Intermediate Event">
      <TextField
        label="Name"
        value={data.name ?? ""}
        onChange={(e) => handleNameChange(e.target.value)}
        fullWidth
      />
      <Select
        label="Intermediate Type"
        value={data.eventType ?? "default"}
        options={INTERMEDIATE_TYPE_OPTIONS}
        onChange={(value) =>
          handleTypeChange(value as BPMNIntermediateEventType)
        }
      />
    </PopoverLayout>
  )
}
