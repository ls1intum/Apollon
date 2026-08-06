import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { DefaultNodeProps } from "@/types"
import { PopoverProps } from "./types"
import { GiveFeedbackAssessmentBox } from "./GiveFeedbackAssessmentBox"
import { useLabels } from "@/i18n/useLabels"
import { PopoverLayout } from "./PopoverLayout"

export const DefaultNodeGiveFeedbackPopover = ({ elementId }: PopoverProps) => {
  const { nodes } = useDiagramStore(
    useShallow((state) => ({ nodes: state.nodes }))
  )
  const t = useLabels()

  const node = nodes.find((node) => node.id === elementId)
  if (!node) return null

  const nodeData = node.data as DefaultNodeProps

  return (
    <PopoverLayout>
      <GiveFeedbackAssessmentBox
        elementId={elementId}
        name={nodeData.name}
        elementType="node"
        typeLabel={t.nodeTypeLabel(node.type)}
      />
    </PopoverLayout>
  )
}
