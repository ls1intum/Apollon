import { CustomEdgeProps } from "@/edges/EdgeProps"
import { useReactFlow } from "@xyflow/react"
import { useEdgePopOver } from "@/hooks"
import { PopoverProps } from "../types"
import { SwapHorizIcon } from "@/components/Icon"
import { EdgeStyleEditor, IconButton, TextField } from "@/components/ui"
import { EdgeTypeSelect, EdgeTypeOption } from "./EdgeTypeSelect"
import {
  ConnectionInfo,
  edgeEndpointNames,
  hasDistinctEndpointNames,
  PopoverLayout,
  PopoverSection,
  swapDirectionTooltip,
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
  const { getEdge, getNode, updateEdgeData } = useReactFlow()

  const edge = getEdge(elementId)
  const { handleEdgeTypeChange, handleSwap, handleLabelChange } =
    useEdgePopOver(elementId)

  if (!edge) {
    return null
  }
  const edgeData = edge.data as CustomEdgeProps | undefined
  const { source: sourceName, target: targetName } = edgeEndpointNames(
    edge,
    getNode
  )

  return (
    <PopoverLayout title="Edge">
      <EdgeStyleEditor
        edgeData={edgeData}
        handleDataFieldUpdate={(key, value) =>
          updateEdgeData(elementId, { ...edge.data, [key]: value })
        }
        label="Style"
        sideElements={[
          handleSwap && (
            <IconButton
              ariaLabel={swapDirectionTooltip(sourceName, targetName)}
              tooltip={swapDirectionTooltip(sourceName, targetName)}
              onClick={handleSwap}
            >
              <SwapHorizIcon width={16} height={16} />
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
