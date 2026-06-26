import { Select } from "@/components/ui"
import { NodeStyleEditor } from "@/components/styleEditor"
import { useReactiveNode } from "@/hooks"
import { useReactFlow } from "@xyflow/react"
import { PopoverProps } from "../types"
import { BPMNMarkerType, BPMNTaskProps, BPMNTaskType } from "@/types"
import { supportsMultilineName } from "@/utils/nodeUtils"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"

const TASK_TYPE_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "user", label: "User" },
  { value: "send", label: "Send" },
  { value: "receive", label: "Receive" },
  { value: "manual", label: "Manual" },
  { value: "business-rule", label: "Business Rule" },
  { value: "script", label: "Script" },
]

const MARKER_OPTIONS = [
  { value: "none", label: "None" },
  { value: "parallel multi instance", label: "Parallel multi instance" },
  { value: "sequential multi instance", label: "Sequential multi instance" },
  { value: "loop", label: "Loop" },
]

export const BPMNTaskEditPopover: React.FC<PopoverProps> = ({ elementId }) => {
  const { updateNodeData } = useReactFlow()
  const node = useReactiveNode(elementId)
  if (!node) return null

  const data = node.data as BPMNTaskProps

  const handleDataFieldUpdate = (key: string, value: string) => {
    updateNodeData(elementId, { [key]: value })
  }

  return (
    <PopoverLayout title="Task">
      <NodeStyleEditor
        handleDataFieldUpdate={(key, value) =>
          handleDataFieldUpdate(key, value)
        }
        nodeData={data}
        isMultilineName={supportsMultilineName(node.type)}
      />

      <PopoverSection divider>
        <Select
          label="Task Type"
          value={data.taskType ?? "default"}
          options={TASK_TYPE_OPTIONS}
          onChange={(value) =>
            handleDataFieldUpdate("taskType", value as BPMNTaskType)
          }
        />

        <Select
          label="Marker"
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
