import { IconButton, TextField } from "@/components/ui"
import { EdgeStyleEditor } from "@/components/styleEditor"
import { useReactFlow } from "@xyflow/react"
import { CustomEdgeProps } from "@/edges/EdgeProps"
import { ArrowLeftRight } from "lucide-react"
import { useEdgePopOver, useReactiveEdge, useReactiveNodeName } from "@/hooks"
import { PopoverProps } from "../types"
import { EdgeTypeSelect, EdgeTypeOption } from "./EdgeTypeSelect"
import { useLabels } from "@/i18n/useLabels"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"

export const EdgeEditPopover: React.FC<PopoverProps> = ({ elementId }) => {
  const t = useLabels()
  const { updateEdgeData } = useReactFlow()

  const CLASS_EDGE_TYPE_OPTIONS: ReadonlyArray<EdgeTypeOption> = [
    { value: "ClassBidirectional", label: t.biAssociation },
    { value: "ClassUnidirectional", label: t.uniAssociation },
    { value: "ClassAggregation", label: t.aggregation },
    { value: "ClassComposition", label: t.composition },
    { value: "ClassInheritance", label: t.inheritance },
    { value: "ClassDependency", label: t.dependency },
    { value: "ClassRealization", label: t.realization },
  ]

  // Subscribe reactively to the edge and its endpoint names so the popover
  // reflects live changes (swap, collaboration). Reading getEdge/getNode
  // imperatively during render is non-reactive and goes stale once the React
  // Compiler memoizes this component.
  const edge = useReactiveEdge(elementId)
  const sourceName = useReactiveNodeName(edge?.source, t.source)
  const targetName = useReactiveNodeName(edge?.target, t.target)

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
          options={CLASS_EDGE_TYPE_OPTIONS}
          onChange={handleEdgeTypeChange}
        />
      </PopoverSection>

      <PopoverSection title={t.source} divider>
        <TextField
          label={t.multiplicityLabel(sourceName)}
          value={edgeData?.sourceMultiplicity ?? ""}
          onChange={(e) => handleSourceMultiplicityChange(e.target.value)}
          fullWidth
          data-testid="edge-source-multiplicity"
        />
        <TextField
          label={t.roleLabel(sourceName)}
          value={edgeData?.sourceRole ?? ""}
          onChange={(e) => handleSourceRoleChange(e.target.value)}
          fullWidth
          data-testid="edge-source-role"
        />
      </PopoverSection>

      <PopoverSection title={t.target} divider>
        <TextField
          label={t.multiplicityLabel(targetName)}
          value={edgeData?.targetMultiplicity ?? ""}
          onChange={(e) => handleTargetMultiplicityChange(e.target.value)}
          fullWidth
          data-testid="edge-target-multiplicity"
        />
        <TextField
          label={t.roleLabel(targetName)}
          value={edgeData?.targetRole ?? ""}
          onChange={(e) => handleTargetRoleChange(e.target.value)}
          fullWidth
          data-testid="edge-target-role"
        />
      </PopoverSection>
    </PopoverLayout>
  )
}
