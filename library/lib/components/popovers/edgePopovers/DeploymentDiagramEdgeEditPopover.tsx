import { IconButton, TextField } from "@/components/ui"
import { EdgeStyleEditor } from "@/components/styleEditor"
import { ArrowLeftRight } from "lucide-react"
import { useReactFlow } from "@xyflow/react"
import { CustomEdgeProps } from "@/edges/EdgeProps"
import { useEdgePopOver, useReactiveEdge, useReactiveNodeName } from "@/hooks"
import { PopoverProps } from "../types"
import { useLabels } from "@/i18n/useLabels"
import { EdgeTypeSelect, EdgeTypeOption } from "./EdgeTypeSelect"
import {
  ConnectionInfo,
  hasDistinctEndpointNames,
  PopoverLayout,
  PopoverSection,
} from "../PopoverLayout"

export const DeploymentEdgeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const t = useLabels()
  const { updateEdgeData } = useReactFlow()

  const DEPLOYMENT_EDGE_TYPE_OPTIONS: ReadonlyArray<EdgeTypeOption> = [
    { value: "DeploymentAssociation", label: t.deploymentAssociation },
    { value: "DeploymentDependency", label: t.deploymentDependency },
    { value: "DeploymentProvidedInterface", label: t.providedInterface },
    { value: "DeploymentRequiredInterface", label: t.requiredInterface },
  ]

  const edge = useReactiveEdge(elementId)
  const sourceName = useReactiveNodeName(edge?.source, t.source)
  const targetName = useReactiveNodeName(edge?.target, t.target)
  const { handleEdgeTypeChange, handleLabelChange, handleSwap } =
    useEdgePopOver(elementId)

  if (!edge) {
    return null
  }

  const edgeData = edge.data as CustomEdgeProps | undefined
  const isConnector =
    edge.type === "DeploymentAssociation" ||
    edge.type === "DeploymentDependency"

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
          options={DEPLOYMENT_EDGE_TYPE_OPTIONS}
          onChange={handleEdgeTypeChange}
        />
      </PopoverSection>

      {hasDistinctEndpointNames(sourceName, targetName) && (
        <PopoverSection title={t.connection} divider>
          <ConnectionInfo source={sourceName} target={targetName} />
        </PopoverSection>
      )}

      {/* Interfaces are drawn as a socket and a lollipop and have no text of
          their own; the two connector types do. */}
      {isConnector && (
        <>
          <PopoverSection title={t.label} divider>
            <TextField
              value={edgeData?.label ?? ""}
              onChange={(e) => handleLabelChange(e.target.value)}
              fullWidth
              placeholder={t.label}
            />
          </PopoverSection>

          <PopoverSection title={t.details} divider>
            <TextField
              label={t.technology}
              value={edgeData?.technology ?? ""}
              onChange={(e) =>
                updateEdgeData(elementId, {
                  ...edge.data,
                  technology: e.target.value,
                })
              }
              placeholder={t.technologyPlaceholder}
              fullWidth
            />
            <TextField
              label={t.description}
              value={edgeData?.description ?? ""}
              onChange={(e) =>
                updateEdgeData(elementId, {
                  ...edge.data,
                  description: e.target.value,
                })
              }
              placeholder={t.descriptionPlaceholder}
              multiline
              minRows={2}
              fullWidth
            />
          </PopoverSection>
        </>
      )}
    </PopoverLayout>
  )
}
