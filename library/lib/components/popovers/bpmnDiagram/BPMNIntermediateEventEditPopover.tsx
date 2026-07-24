import { Select } from "@/components/ui"
import { NodeStyleEditor } from "@/components/styleEditor"
import { useReactiveNode } from "@/hooks"
import { useReactFlow } from "@xyflow/react"
import { PopoverProps } from "../types"
import { BPMNEventProps, BPMNIntermediateEventType } from "@/types"
import { supportsMultilineName } from "@/utils/nodeUtils"
import { useLabels } from "@/i18n/useLabels"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"

export const BPMNIntermediateEventEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const t = useLabels()
  const { updateNodeData } = useReactFlow()
  const node = useReactiveNode(elementId)
  if (!node) return null

  const data = node.data as BPMNEventProps

  const INTERMEDIATE_TYPE_OPTIONS = [
    { value: "default", label: t.bpmnDefault },
    { value: "message-catch", label: t.bpmnMessageCatch },
    { value: "message-throw", label: t.bpmnMessageThrow },
    { value: "timer-catch", label: t.bpmnTimerCatch },
    { value: "escalation-throw", label: t.bpmnEscalationThrow },
    { value: "conditional-catch", label: t.bpmnConditionalCatch },
    { value: "link-catch", label: t.bpmnLinkCatch },
    { value: "link-throw", label: t.bpmnLinkThrow },
    { value: "compensation-throw", label: t.bpmnCompensationThrow },
    { value: "signal-catch", label: t.bpmnSignalCatch },
    { value: "signal-throw", label: t.bpmnSignalThrow },
  ]

  const handleDataFieldUpdate = (key: string, value: string) => {
    updateNodeData(elementId, { [key]: value })
  }

  return (
    <PopoverLayout title={t.intermediateEvent}>
      <NodeStyleEditor
        handleDataFieldUpdate={(key, value) =>
          handleDataFieldUpdate(key, value)
        }
        nodeData={data}
        isMultilineName={supportsMultilineName(node.type)}
      />

      <PopoverSection title={t.type} divider>
        <Select
          label={t.intermediateType}
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
