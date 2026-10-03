import React, { useCallback } from "react"
import {
  type GradingInstructionInfo,
  linkGradingInstruction,
} from "@/utils/gradingInstruction"
import { useLabels } from "@/i18n/useLabels"
import { useShallow } from "zustand/shallow"
import { useDiagramStore } from "@/store/context"

interface Props {
  elementId: string
  elementType?: string
}

export const useDropFeedback = ({
  elementId,
  elementType = "default",
}: Props) => {
  const t = useLabels()
  const { setAssessments } = useDiagramStore(
    useShallow((state) => ({
      setAssessments: state.setAssessments,
    }))
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement | SVGGElement>) => {
      event.preventDefault()
      event.stopPropagation()

      const dropData = event.dataTransfer.getData("text/plain")

      const instruction: GradingInstructionInfo = JSON.parse(dropData)
      // The points-based default titles the give-feedback box writes in; the criterion's title replaces them
      const defaultTitles = [t.feedback, t.positiveFeedback, t.needsRevision]
      // Merged into the element's assessment rather than replacing it, so a title, an assessor's description and an AI
      // suggestion's state survive the drop (see linkGradingInstruction).
      setAssessments((prev) => ({
        ...prev,
        [elementId]: linkGradingInstruction(
          prev[elementId],
          instruction,
          elementId,
          elementType,
          defaultTitles
        ),
      }))
    },
    [elementId, elementType, t]
  )

  return handleDrop
}
