import { CustomEdgeProps } from "@/edges/EdgeProps"
import { useReactFlow } from "@xyflow/react"
import { useEdgePopOver, useReactiveEdge, useReactiveNodeName } from "@/hooks"
import { PopoverProps } from "../types"
import { ArrowLeftRight } from "lucide-react"
import { IconButton, TextField } from "@/components/ui"
import { EdgeStyleEditor } from "@/components/styleEditor"
import { EdgeTypeSelect, EdgeTypeOption } from "./EdgeTypeSelect"
import { useLabels } from "@/i18n/useLabels"
import {
  ConnectionInfo,
  hasDistinctEndpointNames,
  PopoverLayout,
  PopoverSection,
} from "../PopoverLayout"

export const BPMNDiagramEdgeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const t = useLabels()
  const { updateEdgeData } = useReactFlow()

  const BPMN_EDGE_TYPE_OPTIONS: ReadonlyArray<EdgeTypeOption> = [
    { value: "BPMNSequenceFlow", label: t.sequenceFlow },
    { value: "BPMNMessageFlow", label: t.messageFlow },
    { value: "BPMNAssociationFlow", label: t.associationFlow },
    { value: "BPMNDataAssociationFlow", label: t.dataAssociationFlow },
  ]

  const edge = useReactiveEdge(elementId)
  const sourceName = useReactiveNodeName(edge?.source, t.source)
  const targetName = useReactiveNodeName(edge?.target, t.target)
  const { handleEdgeTypeChange, handleSwap, handleLabelChange } =
    useEdgePopOver(elementId)

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
          options={BPMN_EDGE_TYPE_OPTIONS}
          onChange={handleEdgeTypeChange}
        />
      </PopoverSection>

      {hasDistinctEndpointNames(sourceName, targetName) && (
        <PopoverSection title={t.connection} divider>
          <ConnectionInfo source={sourceName} target={targetName} />
        </PopoverSection>
      )}

      <PopoverSection title={t.label} divider>
        <TextField
          value={edgeData?.label ?? ""}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder={t.label}
          fullWidth
        />
      </PopoverSection>
    </PopoverLayout>
  )
}
