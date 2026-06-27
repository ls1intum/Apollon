import { Select } from "@/components/ui"
import { NodeStyleEditor } from "@/components/styleEditor"
import { useReactiveNode } from "@/hooks"
import { useReactFlow } from "@xyflow/react"
import { PopoverProps } from "../types"
import { BPMNGatewayProps, BPMNGatewayType } from "@/types"
import { supportsMultilineName } from "@/utils/nodeUtils"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"

const GATEWAY_TYPE_OPTIONS = [
  { value: "exclusive", label: "Exclusive" },
  { value: "parallel", label: "Parallel" },
  { value: "inclusive", label: "Inclusive" },
  { value: "event-based", label: "Event-based" },
  { value: "complex", label: "Complex" },
]

export const BPMNGatewayEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { updateNodeData } = useReactFlow()
  const node = useReactiveNode(elementId)
  if (!node) return null

  const data = node.data as BPMNGatewayProps

  const handleDataFieldUpdate = (key: string, value: string) => {
    updateNodeData(elementId, { [key]: value })
  }

  return (
    <PopoverLayout title="Gateway">
      <NodeStyleEditor
        handleDataFieldUpdate={(key, value) =>
          handleDataFieldUpdate(key, value)
        }
        nodeData={data}
        isMultilineName={supportsMultilineName(node.type)}
      />

      <PopoverSection title="Gateway Type" divider>
        <Select
          label="Gateway Type"
          value={data.gatewayType ?? "exclusive"}
          options={GATEWAY_TYPE_OPTIONS}
          onChange={(value) =>
            handleDataFieldUpdate("gatewayType", value as BPMNGatewayType)
          }
        />
      </PopoverSection>
    </PopoverLayout>
  )
}
