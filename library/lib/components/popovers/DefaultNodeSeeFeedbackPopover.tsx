import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { DefaultNodeProps } from "@/types"
import { PopoverProps } from "./types"
import { SeeFeedbackAssessmentBox } from "./SeeFeedbackAssessmentBox"
import { useLabels } from "@/i18n/useLabels"
import { PopoverLayout } from "./PopoverLayout"

export const DefaultNodeSeeFeedbackPopover = ({ elementId }: PopoverProps) => {
  const nodes = useDiagramStore(useShallow((state) => state.nodes))
  const t = useLabels()

  const node = nodes.find((node) => node.id === elementId)
  if (!node) return null

  const nodeData = node.data as DefaultNodeProps

  return (
    <PopoverLayout>
      <SeeFeedbackAssessmentBox
        elementId={elementId}
        name={nodeData.name}
        type={node.type || t.node}
        typeLabel={t.nodeTypeLabel(node.type)}
      />
    </PopoverLayout>
  )
}
