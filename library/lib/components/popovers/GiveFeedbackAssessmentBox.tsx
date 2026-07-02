import { useState } from "react"
import { Trash2 } from "lucide-react"
import { useDiagramStore } from "@/store"
import { Assessment } from "@/typings"
import { useShallow } from "zustand/shallow"
import { IconButton, TextField } from "../ui"
import { useLabels } from "@/i18n/useLabels"
import { AssessmentHeader, PopoverSection } from "./PopoverLayout"

/** The coarse category stored on an Assessment's `elementType`. */
type ElementType = "node" | "attribute" | "method" | "edge"

interface Props {
  elementId: string
  name: string
  /**
   * The coarse category stored on the Assessment. Passed explicitly by each
   * caller — a node popover stores "node" regardless of the concrete node type
   * (flowchartProcess, …); deriving it from the concrete type would mis-store
   * every default node as "edge".
   */
  elementType: ElementType
  /** Display label for the header. Defaults to the capitalized `elementType`. */
  typeLabel?: string
  /** Draw a separator above this box. Off for the first box in a popover. */
  divider?: boolean
}

/** Feedback comment cap, surfaced to the grader as an `n/500` helper. */
const FEEDBACK_MAX_LENGTH = 500

const ELEMENT_TYPE_LABEL: Record<ElementType, string> = {
  node: "Node",
  attribute: "Attribute",
  method: "Method",
  edge: "Edge",
}

export const GiveFeedbackAssessmentBox = ({
  elementId,
  name,
  elementType,
  typeLabel,
  divider = false,
}: Props) => {
  const t = useLabels()
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
      elementType,
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
        type={typeLabel ?? ELEMENT_TYPE_LABEL[elementType]}
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
        placeholder={t.addComment}
        fullWidth
      />
    </PopoverSection>
  )
}
