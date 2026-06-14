import { EdgeStyleEditor, IconButton, TextField } from "@/components/ui"
import { SwapHorizIcon } from "@/components/Icon"
import { useReactFlow } from "@xyflow/react"
import { CustomEdgeProps } from "@/edges/EdgeProps"
import { useEdgePopOver } from "@/hooks"
import { PopoverProps } from "../types"
import { EdgeTypeSelect, EdgeTypeOption } from "./EdgeTypeSelect"
import {
  ConnectionInfo,
  edgeEndpointNames,
  hasDistinctEndpointNames,
  PopoverLayout,
  PopoverSection,
  swapDirectionTooltip,
} from "../PopoverLayout"

const USE_CASE_EDGE_TYPE_OPTIONS: ReadonlyArray<EdgeTypeOption> = [
  { value: "UseCaseAssociation", label: "Association" },
  { value: "UseCaseInclude", label: "Include" },
  { value: "UseCaseExtend", label: "Extend" },
  { value: "UseCaseGeneralization", label: "Generalization" },
]

export const UseCaseEdgeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { getEdge, getNode, updateEdgeData } = useReactFlow()

  const edge = getEdge(elementId)
  const { handleEdgeTypeChange, handleLabelChange, handleSwap } =
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
          options={USE_CASE_EDGE_TYPE_OPTIONS}
          onChange={handleEdgeTypeChange}
        />
      </PopoverSection>

      {hasDistinctEndpointNames(sourceName, targetName) && (
        <PopoverSection title="Connection" divider>
          <ConnectionInfo source={sourceName} target={targetName} />
        </PopoverSection>
      )}

      {/* Show label input only for associations */}
      {edge.type === "UseCaseAssociation" && (
        <PopoverSection divider>
          <TextField
            value={edgeData?.label ?? ""}
            onChange={(e) => handleLabelChange(e.target.value)}
            size="small"
            fullWidth
            placeholder="Label"
          />
        </PopoverSection>
      )}
    </PopoverLayout>
  )
}
