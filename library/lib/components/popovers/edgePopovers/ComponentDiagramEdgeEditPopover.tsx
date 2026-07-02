import { IconButton } from "@/components/ui"
import { EdgeStyleEditor } from "@/components/styleEditor"
import { useReactFlow } from "@xyflow/react"
import { ArrowLeftRight } from "lucide-react"
import { useEdgePopOver, useReactiveEdge, useReactiveNodeName } from "@/hooks"
import { PopoverProps } from "../types"
import { CustomEdgeProps } from "@/edges"
import { useLabels } from "@/i18n/useLabels"
import { EdgeTypeSelect, EdgeTypeOption } from "./EdgeTypeSelect"
import {
  ConnectionInfo,
  hasDistinctEndpointNames,
  PopoverLayout,
  PopoverSection,
} from "../PopoverLayout"

export const ComponentEdgeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const t = useLabels()
  const { updateEdgeData } = useReactFlow()

  const COMPONENT_EDGE_TYPE_OPTIONS: ReadonlyArray<EdgeTypeOption> = [
    { value: "ComponentDependency", label: t.dependency },
    { value: "ComponentProvidedInterface", label: t.providedInterface },
    { value: "ComponentRequiredInterface", label: t.requiredInterface },
  ]

  const edge = useReactiveEdge(elementId)
  const sourceName = useReactiveNodeName(edge?.source, t.source)
  const targetName = useReactiveNodeName(edge?.target, t.target)
  const { handleEdgeTypeChange, handleSwap } = useEdgePopOver(elementId)

  if (!edge) {
    return null
  }

  const edgeData = edge.data as CustomEdgeProps | undefined

  return (
    <PopoverLayout title={t.edge}>
      <EdgeStyleEditor
        edgeData={edgeData}
        handleDataFieldUpdate={(key, value) =>
          updateEdgeData(elementId, { ...edge.data, [key]: value })
        }
        label={t.style}
        sideElements={[
          handleSwap && (
            <IconButton
              key="swap-source-target"
              ariaLabel={t.swapSourceTarget}
              tooltip={t.swapSourceTarget}
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
        <PopoverSection title={t.connection} divider>
          <ConnectionInfo source={sourceName} target={targetName} />
        </PopoverSection>
      )}
    </PopoverLayout>
  )
}
