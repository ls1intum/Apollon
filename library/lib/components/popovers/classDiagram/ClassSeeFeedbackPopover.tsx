import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { ClassNodeProps } from "@/types"
import { PopoverProps } from "../types"
import { SeeFeedbackAssessmentBox } from "../SeeFeedbackAssessmentBox"
import { useLabels } from "@/i18n/useLabels"
import { PopoverLayout } from "../PopoverLayout"

export const ClassSeeFeedbackPopover = ({ elementId }: PopoverProps) => {
  const nodes = useDiagramStore(useShallow((state) => state.nodes))
  const t = useLabels()

  const node = nodes.find((node) => node.id === elementId)
  if (!node) return null

  const nodeData = node.data as ClassNodeProps

  return (
    <PopoverLayout>
      <SeeFeedbackAssessmentBox
        elementId={elementId}
        name={nodeData.name}
        type={node.type ?? ""}
        typeLabel={t.nodeTypeLabel(node.type)}
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
    </PopoverLayout>
  )
}
