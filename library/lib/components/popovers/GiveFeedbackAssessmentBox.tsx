import { useState } from "react"
import { useDiagramStore } from "@/store"
import { Assessment } from "@/typings"
import { useShallow } from "zustand/shallow"
import { DeleteIcon } from "../Icon"
import { Typography } from "../ui"

interface Props {
  elementId: string
  name: string
  type: string
}

export const GiveFeedbackAssessmentBox = ({ elementId, name, type }: Props) => {
  const { assessments, setAssessments } = useDiagramStore(
    useShallow((state) => ({
      assessments: state.assessments,
      setAssessments: state.setAssessments,
    }))
  )

  const existing = assessments[elementId]

  const [score, setScore] = useState(existing?.score?.toString() ?? "")
  const [feedback, setFeedback] = useState(existing?.feedback ?? "")

  const updateAssessment = (newScore: string, newFeedback: string) => {
    const parsedScore = parseFloat(newScore)
    const validScore = isNaN(parsedScore) ? 0 : parsedScore

    const updated: Assessment = {
      modelElementId: elementId,
      elementType: type.toLowerCase() as "node" | "attribute" | "method",
      score: newScore === "" ? 0 : validScore,
      feedback: newFeedback || undefined,
      correctionStatus: { status: "NOT_VALIDATED" },
    }

    setAssessments((prev) => ({
      ...prev,
      [elementId]: updated,
    }))
  }
  const handleDelete = () => {
    setAssessments((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [elementId]: _, ...rest } = prev
      return rest
    })
    setScore("")
    setFeedback("")
  }

  return (
    <>
      <Typography>{`Assessment for ${type} "${name}"`}</Typography>
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginTop: "px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{ display: "flex", gap: "4px", alignItems: "center", flex: 1 }}
        >
          <Typography>Points:</Typography>
          <input
            style={{
              border: "1px solid black",
              borderRadius: "4px",
              padding: "4px",
              flex: 1,
              backgroundColor: "var(--apollon-background, white)",
              color: "var(--apollon-primary-contrast, #000000)",
            }}
            maxLength={20}
            type="number"
            value={score}
            onChange={(e) => {
              const value = e.target.value
              setScore(value)
              updateAssessment(value, feedback)
            }}
          />
        </div>

        <DeleteIcon onClick={handleDelete} />
      </div>
      <div style={{ marginTop: "8px" }}>
        <Typography>Feedback:</Typography>
        <div style={{ display: "flex" }}>
          <textarea
            style={{
              border: "1px solid black",
              borderRadius: "4px",
              padding: "4px",
              flex: 1,
              resize: "vertical",
              backgroundColor: "var(--apollon-background, white)",
              color: "var(--apollon-primary-contrast, #000000)",
            }}
            placeholder="You can enter feedback here..."
            maxLength={500}
            rows={3}
            value={feedback}
            onChange={(e) => {
              const value = e.target.value
              setFeedback(value)
              updateAssessment(score, value)
            }}
          />
        </div>
      </div>
      <div
        style={{
          marginTop: "12px",
          marginBottom: "12px",
          width: "100%",
          height: "1px",
          backgroundColor: "#ccc",
        }}
      />
    </>
  )
}
