import React, { useCallback } from "react"
import {
  isGradingInstruction,
  linkGradingInstruction,
} from "@/utils/gradingInstruction"
import { isDefaultAssessmentTitle } from "@/utils/assessmentTitle"
import { useLabels } from "@/i18n/useLabels"
import { useShallow } from "zustand/shallow"
import { useDiagramStore } from "@/store/context"

interface Props {
  elementId: string
  elementType?: string
}

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
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

      const instruction = parseJson(event.dataTransfer.getData("text/plain"))
      if (!isGradingInstruction(instruction)) return

      setAssessments((prev) => {
        const linked = linkGradingInstruction(
          prev[elementId],
          instruction,
          elementId,
          elementType
        )
        return {
          ...prev,
          // A default title keeps following the sign of the new points.
          [elementId]: isDefaultAssessmentTitle(linked.title, t)
            ? { ...linked, title: undefined }
            : linked,
        }
      })
    },
    [elementId, elementType, setAssessments, t]
  )

  return handleDrop
}
