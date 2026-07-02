import { Select } from "@/components/ui"
import { NodeStyleEditor } from "@/components/styleEditor"
import { useReactiveNode } from "@/hooks"
import { useReactFlow } from "@xyflow/react"
import { PopoverProps } from "../types"
import { BPMNEventProps, BPMNStartEventType } from "@/types"
import { supportsMultilineName } from "@/utils/nodeUtils"
import { useLabels } from "@/i18n/useLabels"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"

export const BPMNStartEventEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const t = useLabels()
  const { updateNodeData } = useReactFlow()
  const node = useReactiveNode(elementId)
  if (!node) return null

  const data = node.data as BPMNEventProps

  const START_TYPE_OPTIONS = [
    { value: "default", label: t.bpmnDefault },
    { value: "message", label: t.message },
    { value: "timer", label: t.bpmnTimer },
    { value: "conditional", label: t.bpmnConditional },
    { value: "signal", label: t.bpmnSignal },
  ]

  const handleDataFieldUpdate = (key: string, value: string) => {
    updateNodeData(elementId, { [key]: value })
  }

  return (
    <PopoverLayout title={t.startEvent}>
      <NodeStyleEditor
        handleDataFieldUpdate={(key, value) =>
          handleDataFieldUpdate(key, value)
        }
        nodeData={data}
        isMultilineName={supportsMultilineName(node.type)}
      />

      <PopoverSection title={t.type} divider>
        <Select
          label={t.startType}
          value={data.eventType ?? "default"}
          options={START_TYPE_OPTIONS}
          onChange={(value) =>
            handleDataFieldUpdate("eventType", value as BPMNStartEventType)
          }
        />
      </PopoverSection>
    </PopoverLayout>
  )
}
