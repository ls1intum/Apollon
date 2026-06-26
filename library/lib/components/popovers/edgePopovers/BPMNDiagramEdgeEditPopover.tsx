import { CustomEdgeProps } from "@/edges/EdgeProps"
import { useReactFlow } from "@xyflow/react"
import { useEdgePopOver, useReactiveEdge, useReactiveNodeName } from "@/hooks"
import { PopoverProps } from "../types"
import { ArrowLeftRight } from "lucide-react"
import { IconButton, TextField } from "@/components/ui"
import { EdgeStyleEditor } from "@/components/styleEditor"
import { EdgeTypeSelect, EdgeTypeOption } from "./EdgeTypeSelect"
import {
  ConnectionInfo,
  hasDistinctEndpointNames,
  PopoverLayout,
  PopoverSection,
} from "../PopoverLayout"

const BPMN_EDGE_TYPE_OPTIONS: ReadonlyArray<EdgeTypeOption> = [
  { value: "BPMNSequenceFlow", label: "Sequence Flow" },
  { value: "BPMNMessageFlow", label: "Message Flow" },
  { value: "BPMNAssociationFlow", label: "Association Flow" },
  { value: "BPMNDataAssociationFlow", label: "Data Association Flow" },
]

export const BPMNDiagramEdgeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { updateEdgeData } = useReactFlow()

  const edge = useReactiveEdge(elementId)
  const sourceName = useReactiveNodeName(edge?.source, "Source")
  const targetName = useReactiveNodeName(edge?.target, "Target")
  const { handleEdgeTypeChange, handleSwap, handleLabelChange } =
    useEdgePopOver(elementId)

  if (!edge) {
    return null
  }
  const edgeData = edge.data as CustomEdgeProps | undefined

  return (
    <PopoverLayout title="Edge">
      <EdgeStyleEditor
        edgeData={edgeData}
        handleDataFieldUpdate={(key, value) =>
          updateEdgeData(elementId, { ...edge.data, [key]: value })
        }
        label="Control Flow"
        sideElements={[
          handleSwap && (
            <IconButton
              ariaLabel="Swap source and target"
              tooltip="Swap source and target"
              onClick={handleSwap}
            >
              <ArrowLeftRight width={16} height={16} aria-hidden="true" />
            </IconButton>
          ),
        ]}
      />

      <PopoverSection divider>
        <EdgeTypeSelect
          value={edge.type}
          options={BPMN_EDGE_TYPE_OPTIONS}
          onChange={handleEdgeTypeChange}
        />
      </PopoverSection>

      {hasDistinctEndpointNames(sourceName, targetName) && (
        <PopoverSection title="Connection" divider>
          <ConnectionInfo source={sourceName} target={targetName} />
        </PopoverSection>
      )}

      <PopoverSection divider>
        <TextField
          value={edgeData?.label ?? ""}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Label"
          size="small"
          fullWidth
        />
      </PopoverSection>
    </PopoverLayout>
  )
}
