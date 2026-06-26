import { useReactiveNode } from "@/hooks"
import { useReactFlow } from "@xyflow/react"
import { PopoverProps } from "../types"
import { BPMNGatewayType } from "@/types"
import { Select, TextField } from "@/components/ui"
import { PopoverLayout } from "../PopoverLayout"

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

  const data = node.data as { name?: string; gatewayType?: BPMNGatewayType }

  const handleNameChange = (value: string) =>
    updateNodeData(elementId, { name: value })
  const handleTypeChange = (value: BPMNGatewayType) =>
    updateNodeData(elementId, { gatewayType: value })

  return (
    <PopoverLayout title="Gateway">
      <TextField
        label="Name"
        value={data.name ?? ""}
        onChange={(e) => handleNameChange(e.target.value)}
        fullWidth
      />
      <Select
        label="Gateway Type"
        value={data.gatewayType ?? "exclusive"}
        options={GATEWAY_TYPE_OPTIONS}
        onChange={(value) => handleTypeChange(value as BPMNGatewayType)}
      />
    </PopoverLayout>
  )
}
