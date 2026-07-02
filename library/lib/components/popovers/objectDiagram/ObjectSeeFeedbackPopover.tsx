import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { ObjectNodeProps } from "@/types"
import { PopoverProps } from "../types"
import { SeeFeedbackAssessmentBox } from "../SeeFeedbackAssessmentBox"
import { useGoToNextAssessment } from "@/hooks"
import { useLabels } from "@/i18n/useLabels"
import { nodeTypeLabel } from "@/utils/nodeUtils"
import { Button } from "@tumaet/ui/components/button"
import { PopoverLayout } from "../PopoverLayout"

export const ObjectSeeFeedbackPopover = ({ elementId }: PopoverProps) => {
  const nodes = useDiagramStore(useShallow((state) => state.nodes))
  const t = useLabels()
  const handleGoToNextAssessment = useGoToNextAssessment(elementId)

  const node = nodes.find((node) => node.id === elementId)
  if (!node) return null

  const nodeData = node.data as ObjectNodeProps

  return (
    <PopoverLayout>
      <SeeFeedbackAssessmentBox
        elementId={elementId}
        name={nodeData.name}
        type={node.type ?? ""}
        typeLabel={nodeTypeLabel(node.type)}
      />

      {nodeData.attributes.map((attr) => (
        <SeeFeedbackAssessmentBox
          key={attr.id}
          elementId={attr.id}
          name={attr.name}
          type={t.attribute}
          divider
        />
      ))}
      {nodeData.methods.map((method) => (
        <SeeFeedbackAssessmentBox
          key={method.id}
          elementId={method.id}
          name={method.name}
          type={t.method}
          divider
        />
      ))}
      <Button variant="outline" onClick={handleGoToNextAssessment}>
        {t.nextAssessment}
      </Button>
    </PopoverLayout>
  )
}
