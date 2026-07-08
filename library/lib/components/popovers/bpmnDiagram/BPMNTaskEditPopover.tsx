import { Select } from "@/components/ui"
import { NodeStyleEditor } from "@/components/styleEditor"
import { useReactiveNode } from "@/hooks"
import { useReactFlow } from "@xyflow/react"
import { PopoverProps } from "../types"
import { BPMNMarkerType, BPMNTaskProps, BPMNTaskType } from "@/types"
import { supportsMultilineName } from "@/utils/nodeUtils"
import { useLabels } from "@/i18n/useLabels"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"

export const BPMNTaskEditPopover: React.FC<PopoverProps> = ({ elementId }) => {
  const t = useLabels()
  const { updateNodeData } = useReactFlow()
  const node = useReactiveNode(elementId)
  if (!node) return null

  const data = node.data as BPMNTaskProps

  const TASK_TYPE_OPTIONS = [
    { value: "default", label: t.bpmnDefault },
    { value: "user", label: t.bpmnUser },
    { value: "send", label: t.bpmnSend },
    { value: "receive", label: t.bpmnReceive },
    { value: "manual", label: t.bpmnManual },
    { value: "business-rule", label: t.bpmnBusinessRule },
    { value: "script", label: t.bpmnScript },
  ]

  const MARKER_OPTIONS = [
    { value: "none", label: t.bpmnMarkerNone },
    { value: "parallel multi instance", label: t.bpmnParallelMultiInstance },
    {
      value: "sequential multi instance",
      label: t.bpmnSequentialMultiInstance,
    },
    { value: "loop", label: t.bpmnLoop },
  ]

  const handleDataFieldUpdate = (key: string, value: string) => {
    updateNodeData(elementId, { [key]: value })
  }

  return (
    <PopoverLayout title={t.task}>
      <NodeStyleEditor
        handleDataFieldUpdate={(key, value) =>
          handleDataFieldUpdate(key, value)
        }
        nodeData={data}
        isMultilineName={supportsMultilineName(node.type)}
      />

      <PopoverSection divider>
        <Select
          label={t.taskType}
          value={data.taskType ?? "default"}
          options={TASK_TYPE_OPTIONS}
          onChange={(value) =>
            handleDataFieldUpdate("taskType", value as BPMNTaskType)
          }
        />

        <Select
          label={t.marker}
          value={data.marker ?? "none"}
          options={MARKER_OPTIONS}
          onChange={(value) =>
            handleDataFieldUpdate("marker", value as BPMNMarkerType)
          }
        />
      </PopoverSection>
    </PopoverLayout>
  )
}
