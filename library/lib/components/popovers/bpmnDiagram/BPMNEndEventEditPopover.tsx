import { Select } from "@/components/ui"
import { NodeStyleEditor } from "@/components/styleEditor"
import { useReactiveNode } from "@/hooks"
import { useReactFlow } from "@xyflow/react"
import { PopoverProps } from "../types"
import { BPMNEventProps, BPMNEndEventType } from "@/types"
import { supportsMultilineName } from "@/utils/nodeUtils"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"

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

  const data = node.data as BPMNEventProps

  const handleDataFieldUpdate = (key: string, value: string) => {
    updateNodeData(elementId, { [key]: value })
  }

  return (
    <PopoverLayout title="End Event">
      <NodeStyleEditor
        handleDataFieldUpdate={(key, value) =>
          handleDataFieldUpdate(key, value)
        }
        nodeData={data}
        isMultilineName={supportsMultilineName(node.type)}
      />

      <PopoverSection title="Type" divider>
        <Select
          label="End Type"
          value={data.eventType ?? "default"}
          options={END_TYPE_OPTIONS}
          onChange={(value) =>
            handleDataFieldUpdate("eventType", value as BPMNEndEventType)
          }
        />
      </PopoverSection>
    </PopoverLayout>
  )
}
