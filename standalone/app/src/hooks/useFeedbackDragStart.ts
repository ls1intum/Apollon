import { useCallback } from "react"

interface FeedbackData {
  credits: number
  feedback: string
}

export const useFeedbackDragStart = () => {
  const handleDragStart = useCallback(
    (e: React.DragEvent, feedbackData: FeedbackData) => {
      e.dataTransfer.setData("text/plain", JSON.stringify(feedbackData))
      e.dataTransfer.effectAllowed = "move"
    },
    []
  )

  return handleDragStart
}
