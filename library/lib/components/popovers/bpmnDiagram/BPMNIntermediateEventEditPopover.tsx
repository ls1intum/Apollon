import { Select } from "@/components/ui"
import { NodeStyleEditor } from "@/components/styleEditor"
import { useReactiveNode } from "@/hooks"
import { useReactFlow } from "@xyflow/react"
import { PopoverProps } from "../types"
import { BPMNEventProps, BPMNIntermediateEventType } from "@/types"
import { supportsMultilineName } from "@/utils/nodeUtils"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"

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

  const data = node.data as BPMNEventProps

  const handleDataFieldUpdate = (key: string, value: string) => {
    updateNodeData(elementId, { [key]: value })
  }

  return (
    <PopoverLayout title="Intermediate Event">
      <NodeStyleEditor
        handleDataFieldUpdate={(key, value) =>
          handleDataFieldUpdate(key, value)
        }
        nodeData={data}
        isMultilineName={supportsMultilineName(node.type)}
      />

      <PopoverSection title="Type" divider>
        <Select
          label="Intermediate Type"
          value={data.eventType ?? "default"}
          options={INTERMEDIATE_TYPE_OPTIONS}
          onChange={(value) =>
            handleDataFieldUpdate(
              "eventType",
              value as BPMNIntermediateEventType
            )
          }
        />
      </PopoverSection>
    </PopoverLayout>
  )
}
