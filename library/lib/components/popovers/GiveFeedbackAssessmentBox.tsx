import { useState } from "react"
import { Trash2 } from "lucide-react"
import { useDiagramStore } from "@/store"
import { Assessment } from "@/typings"
import { useShallow } from "zustand/shallow"
import { IconButton, TextField } from "../ui"
import { AssessmentHeader, PopoverSection } from "./PopoverLayout"

interface Props {
  elementId: string
  name: string
  /** Drives the stored `elementType` — keep as the real element type. */
  type: string
  /** Display-only label for the header (e.g. "Edge"). Defaults to `type`. */
  typeLabel?: string
  /** Draw a separator above this box. Off for the first box in a popover. */
  divider?: boolean
}

/** Feedback comment cap, surfaced to the grader as an `n/500` helper. */
const FEEDBACK_MAX_LENGTH = 500

// The coarse `elementType` stored on an Assessment. Node parts arrive as
// "Node"/"Attribute"/"Method", but edge callers pass the concrete edge type
// (e.g. "ClassBidirectional"), so anything that isn't a known node part folds
// to "edge" rather than being mis-stored as a node category.
const NODE_PART_TYPES = ["node", "attribute", "method"]
const resolveElementType = (type: string): string => {
  const normalized = type.toLowerCase()
  return NODE_PART_TYPES.includes(normalized) ? normalized : "edge"
}

export const GiveFeedbackAssessmentBox = ({
  elementId,
  name,
  type,
  typeLabel,
  divider = false,
}: Props) => {
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
      elementType: resolveElementType(type),
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
      const { [elementId]: _, ...rest } = prev
      return rest
    })
    setScore("")
    setFeedback("")
  }

  return (
    <PopoverSection divider={divider}>
      <AssessmentHeader
        type={typeLabel ?? type}
        name={name}
        action={
          <IconButton
            ariaLabel={`Delete assessment for ${name}`}
            tooltip="Delete assessment"
            onClick={handleDelete}
          >
            <Trash2 width={16} height={16} aria-hidden="true" />
          </IconButton>
        }
      />
      <TextField
        type="number"
        label="Points"
        helperText="Negative points are allowed."
        value={score}
        onChange={(e) => {
          const value = e.target.value
          setScore(value)
          updateAssessment(value, feedback)
        }}
        placeholder="0"
        fullWidth
      />
      <TextField
        multiline
        minRows={3}
        maxLength={FEEDBACK_MAX_LENGTH}
        label="Feedback"
        helperText={`${feedback.length}/${FEEDBACK_MAX_LENGTH}`}
        value={feedback}
        onChange={(e) => {
          const value = e.target.value
          setFeedback(value)
          updateAssessment(score, value)
        }}
        placeholder="Add a comment…"
        fullWidth
      />
    </PopoverSection>
  )
}
