import { EdgeStyleEditor, IconButton } from "@/components/ui"
import { useReactFlow } from "@xyflow/react"
import { SwapHorizIcon } from "@/components/Icon"
import { useEdgePopOver } from "@/hooks"
import { PopoverProps } from "../types"
import { CustomEdgeProps } from "@/edges"
import { EdgeTypeSelect, EdgeTypeOption } from "./EdgeTypeSelect"
import {
  ConnectionInfo,
  edgeEndpointNames,
  hasDistinctEndpointNames,
  PopoverLayout,
  PopoverSection,
  swapDirectionTooltip,
} from "../PopoverLayout"

const COMPONENT_EDGE_TYPE_OPTIONS: ReadonlyArray<EdgeTypeOption> = [
  { value: "ComponentDependency", label: "Dependency" },
  { value: "ComponentProvidedInterface", label: "Provided Interface" },
  { value: "ComponentRequiredInterface", label: "Required Interface" },
]

export const ComponentEdgeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { getEdge, getNode, updateEdgeData } = useReactFlow()

  const edge = getEdge(elementId)
  const { handleEdgeTypeChange, handleSwap } = useEdgePopOver(elementId)

  if (!edge) {
    return null
  }

  const { source: sourceName, target: targetName } = edgeEndpointNames(
    edge,
    getNode
  )

  const edgeData = edge.data as CustomEdgeProps | undefined

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
          options={COMPONENT_EDGE_TYPE_OPTIONS}
          onChange={handleEdgeTypeChange}
        />
      </PopoverSection>

      {hasDistinctEndpointNames(sourceName, targetName) && (
        <PopoverSection title="Connection" divider>
          <ConnectionInfo source={sourceName} target={targetName} />
        </PopoverSection>
      )}
    </PopoverLayout>
  )
}
