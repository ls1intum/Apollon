import { Select } from "@/components/ui"
import { NodeStyleEditor } from "@/components/styleEditor"
import { useReactiveNode } from "@/hooks"
import { useReactFlow } from "@xyflow/react"
import { PopoverProps } from "../types"
import { BPMNGatewayProps, BPMNGatewayType } from "@/types"
import { supportsMultilineName } from "@/utils/nodeUtils"
import { useLabels } from "@/i18n/useLabels"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"

export const BPMNGatewayEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const t = useLabels()
  const { updateNodeData } = useReactFlow()
  const node = useReactiveNode(elementId)
  if (!node) return null

  const data = node.data as BPMNGatewayProps

  const GATEWAY_TYPE_OPTIONS = [
    { value: "exclusive", label: t.bpmnExclusive },
    { value: "parallel", label: t.bpmnParallel },
    { value: "inclusive", label: t.bpmnInclusive },
    { value: "event-based", label: t.bpmnEventBased },
    { value: "complex", label: t.bpmnComplex },
  ]

  const handleDataFieldUpdate = (key: string, value: string) => {
    updateNodeData(elementId, { [key]: value })
  }

  return (
    <PopoverLayout title={t.gateway}>
      <NodeStyleEditor
        handleDataFieldUpdate={(key, value) =>
          handleDataFieldUpdate(key, value)
        }
        nodeData={data}
        isMultilineName={supportsMultilineName(node.type)}
      />

      <PopoverSection title={t.gatewayType} divider>
        <Select
          label={t.gatewayType}
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
