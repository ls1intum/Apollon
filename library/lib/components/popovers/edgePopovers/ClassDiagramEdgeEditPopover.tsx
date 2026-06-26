import { IconButton, TextField } from "@/components/ui"
import { EdgeStyleEditor } from "@/components/styleEditor"
import { useReactFlow } from "@xyflow/react"
import { CustomEdgeProps } from "@/edges/EdgeProps"
import { ArrowLeftRight } from "lucide-react"
import { useEdgePopOver, useReactiveEdge, useReactiveNodeName } from "@/hooks"
import { PopoverProps } from "../types"
import { EdgeTypeSelect, EdgeTypeOption } from "./EdgeTypeSelect"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"

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
  const { updateEdgeData } = useReactFlow()

  // Subscribe reactively to the edge and its endpoint names so the popover
  // reflects live changes (swap, collaboration). Reading getEdge/getNode
  // imperatively during render is non-reactive and goes stale once the React
  // Compiler memoizes this component.
  const edge = useReactiveEdge(elementId)
  const sourceName = useReactiveNodeName(edge?.source, "Source")
  const targetName = useReactiveNodeName(edge?.target, "Target")

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
          options={CLASS_EDGE_TYPE_OPTIONS}
          onChange={handleEdgeTypeChange}
        />
      </PopoverSection>

      <PopoverSection title="Source" divider>
        <TextField
          label={`${sourceName} Multiplicity`}
          value={edgeData?.sourceMultiplicity ?? ""}
          onChange={(e) => handleSourceMultiplicityChange(e.target.value)}
          size="small"
          fullWidth
          data-testid="edge-source-multiplicity"
        />
        <TextField
          label={`${sourceName} Role`}
          value={edgeData?.sourceRole ?? ""}
          onChange={(e) => handleSourceRoleChange(e.target.value)}
          size="small"
          fullWidth
          data-testid="edge-source-role"
        />
      </PopoverSection>

      <PopoverSection title="Target" divider>
        <TextField
          label={`${targetName} Multiplicity`}
          value={edgeData?.targetMultiplicity ?? ""}
          onChange={(e) => handleTargetMultiplicityChange(e.target.value)}
          size="small"
          fullWidth
          data-testid="edge-target-multiplicity"
        />
        <TextField
          label={`${targetName} Role`}
          value={edgeData?.targetRole ?? ""}
          onChange={(e) => handleTargetRoleChange(e.target.value)}
          size="small"
          fullWidth
          data-testid="edge-target-role"
        />
      </PopoverSection>
    </PopoverLayout>
  )
}
