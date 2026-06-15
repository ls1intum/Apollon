import { EdgeStyleEditor, IconButton, TextField } from "@/components/ui"
import { useReactFlow } from "@xyflow/react"
import { CustomEdgeProps } from "@/edges/EdgeProps"
import { ArrowLeftRight } from "lucide-react"
import { useEdgePopOver } from "@/hooks"
import { PopoverProps } from "../types"
import { EdgeTypeSelect, EdgeTypeOption } from "./EdgeTypeSelect"
import {
  edgeEndpointNames,
  PopoverLayout,
  PopoverSection,
  swapDirectionTooltip,
} from "../PopoverLayout"

const CLASS_EDGE_TYPE_OPTIONS: ReadonlyArray<EdgeTypeOption> = [
  { value: "ClassBidirectional", label: "Bi-Association" },
  { value: "ClassUnidirectional", label: "Uni-Association" },
  { value: "ClassAggregation", label: "Aggregation" },
  { value: "ClassComposition", label: "Composition" },
  { value: "ClassInheritance", label: "Inheritance" },
  { value: "ClassDependency", label: "Dependency" },
  { value: "ClassRealization", label: "Realization" },
]

export const EdgeEditPopover: React.FC<PopoverProps> = ({ elementId }) => {
  const { getEdge, getNode, updateEdgeData } = useReactFlow()

  const edge = getEdge(elementId)
  const {
    handleSourceRoleChange,
    handleSourceMultiplicityChange,
    handleTargetRoleChange,
    handleTargetMultiplicityChange,
    handleEdgeTypeChange,
    handleSwap,
  } = useEdgePopOver(elementId)

  if (!edge) {
    return null
  }

  const edgeData = edge.data as CustomEdgeProps | undefined
  const { source: rawSourceName, target: rawTargetName } = edgeEndpointNames(
    edge,
    getNode
  )
  // Append the endpoint name only when it exists, else just "Source"/"Target".
  const sourceTitle = rawSourceName ? `Source: ${rawSourceName}` : "Source"
  const targetTitle = rawTargetName ? `Target: ${rawTargetName}` : "Target"

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
              ariaLabel={swapDirectionTooltip(rawSourceName, rawTargetName)}
              tooltip={swapDirectionTooltip(rawSourceName, rawTargetName)}
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
          options={CLASS_EDGE_TYPE_OPTIONS}
          onChange={handleEdgeTypeChange}
        />
      </PopoverSection>

      <PopoverSection title={sourceTitle} divider>
        <TextField
          value={edgeData?.sourceMultiplicity ?? ""}
          onChange={(e) => handleSourceMultiplicityChange(e.target.value)}
          placeholder="Multiplicity"
          size="small"
          fullWidth
        />
        <TextField
          value={edgeData?.sourceRole ?? ""}
          onChange={(e) => handleSourceRoleChange(e.target.value)}
          placeholder="Role"
          size="small"
          fullWidth
        />
      </PopoverSection>

      <PopoverSection title={targetTitle} divider>
        <TextField
          value={edgeData?.targetMultiplicity ?? ""}
          onChange={(e) => handleTargetMultiplicityChange(e.target.value)}
          placeholder="Multiplicity"
          size="small"
          fullWidth
        />
        <TextField
          value={edgeData?.targetRole ?? ""}
          onChange={(e) => handleTargetRoleChange(e.target.value)}
          placeholder="Role"
          size="small"
          fullWidth
        />
      </PopoverSection>
    </PopoverLayout>
  )
}
