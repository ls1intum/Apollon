import { Select } from "@/components/ui"
import { NodeStyleEditor } from "@/components/styleEditor"
import { useReactiveNode } from "@/hooks"
import { useReactFlow } from "@xyflow/react"
import { PopoverProps } from "../types"
import { BPMNEventProps, BPMNEndEventType } from "@/types"
import { supportsMultilineName } from "@/utils/nodeUtils"
import { useLabels } from "@/i18n/useLabels"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"

export const BPMNEndEventEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const t = useLabels()
  const { updateNodeData } = useReactFlow()
  const node = useReactiveNode(elementId)
  if (!node) return null

  const data = node.data as BPMNEventProps

  const END_TYPE_OPTIONS = [
    { value: "default", label: t.bpmnDefault },
    { value: "message", label: t.message },
    { value: "escalation", label: t.bpmnEscalation },
    { value: "error", label: t.bpmnError },
    { value: "compensation", label: t.bpmnCompensation },
    { value: "signal", label: t.bpmnSignal },
    { value: "terminate", label: t.bpmnTerminate },
  ]

  const handleDataFieldUpdate = (key: string, value: string) => {
    updateNodeData(elementId, { [key]: value })
  }

  return (
    <PopoverLayout title={t.endEvent}>
      <NodeStyleEditor
        handleDataFieldUpdate={(key, value) =>
          handleDataFieldUpdate(key, value)
        }
        nodeData={data}
        isMultilineName={supportsMultilineName(node.type)}
      />

      <PopoverSection title={t.type} divider>
        <Select
          label={t.endType}
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
