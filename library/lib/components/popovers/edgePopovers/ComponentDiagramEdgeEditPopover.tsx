import { IconButton } from "@/components/ui"
import { EdgeStyleEditor } from "@/components/styleEditor"
import { useReactFlow } from "@xyflow/react"
import { ArrowLeftRight } from "lucide-react"
import { useEdgePopOver, useReactiveEdge, useReactiveNodeName } from "@/hooks"
import { PopoverProps } from "../types"
import { CustomEdgeProps } from "@/edges"
import { EdgeTypeSelect, EdgeTypeOption } from "./EdgeTypeSelect"
import {
  ConnectionInfo,
  hasDistinctEndpointNames,
  PopoverLayout,
  PopoverSection,
} from "../PopoverLayout"

const COMPONENT_EDGE_TYPE_OPTIONS: ReadonlyArray<EdgeTypeOption> = [
  { value: "ComponentDependency", label: "Dependency" },
  { value: "ComponentProvidedInterface", label: "Provided Interface" },
  { value: "ComponentRequiredInterface", label: "Required Interface" },
]

export const ComponentEdgeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { updateEdgeData } = useReactFlow()

  const edge = useReactiveEdge(elementId)
  const sourceName = useReactiveNodeName(edge?.source, "Source")
  const targetName = useReactiveNodeName(edge?.target, "Target")
  const { handleEdgeTypeChange, handleSwap } = useEdgePopOver(elementId)

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
        label="Style"
        sideElements={[
          handleSwap && (
            <IconButton
              key="swap-source-target"
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
