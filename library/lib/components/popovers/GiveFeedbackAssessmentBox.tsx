import { useState } from "react"
import { Sparkles, Trash2 } from "lucide-react"
import { useDiagramStore } from "@/store"
import { Assessment } from "@/typings"
import { useShallow } from "zustand/shallow"
import { IconButton, TextField, Typography } from "../ui"
import { useLabels } from "@/i18n/useLabels"
import { PopoverSection } from "./PopoverLayout"
import { AssessmentScoreInput, toneFor } from "./AssessmentScoreInput"
import { defaultTitleFor } from "./assessmentTitle"

/** Gap between controls within a row (reference chip, title/score/delete). */
const ROW_GAP = 8

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

/**
 * Title cap. No counter is shown (matches the host's unified feedback title
 * field), but the host's own Feedback.text column caps at 500 — this stays
 * well under it since a title is meant to stay a headline, not a paragraph.
 */
const TITLE_MAX_LENGTH = 100

export const GiveFeedbackAssessmentBox = ({
  elementId,
  name,
  elementType,
  typeLabel,
  divider = false,
}: Props) => {
  const t = useLabels()
  const ELEMENT_TYPE_LABEL: Record<ElementType, string> = {
    node: t.node,
    attribute: t.attribute,
    method: t.method,
    edge: t.edge,
  }
  const typeText = typeLabel ?? ELEMENT_TYPE_LABEL[elementType]

  const { assessments, setAssessments } = useDiagramStore(
    useShallow((state) => ({
      assessments: state.assessments,
      setAssessments: state.setAssessments,
    }))
  )

  const existing = assessments[elementId]

  // `title` is the short headline (host: Feedback.text); `feedback` is the
  // longer explanation (host: Feedback.detailText) — mirroring the host's
  // unified feedback card, which shows an editable title next to the score
  // pill and a separate detail box below, rather than one undifferentiated
  // comment field.
  const [title, setTitle] = useState(existing?.title ?? "")
  const [score, setScore] = useState(existing?.score?.toString() ?? "")
  const [feedback, setFeedback] = useState(existing?.feedback ?? "")

  // Default title placeholder tracks the score's sign — see assessmentTitle.ts.
  const defaultTitle = defaultTitleFor(toneFor(score), t)

  const updateAssessment = (
    newTitle: string,
    newScore: string,
    newFeedback: string
  ) => {
    const parsedScore = parseFloat(newScore)
    const validScore = isNaN(parsedScore) ? 0 : parsedScore

    const updated: Assessment = {
      modelElementId: elementId,
      elementType,
      score: newScore === "" ? 0 : validScore,
      title: newTitle || undefined,
      feedback: newFeedback || undefined,
      correctionStatus: { status: "NOT_VALIDATED" },
      // A suggestion transitions to adapted the moment it is touched, mirroring the host's unified
      // feedback card (see UnifiedFeedbackComponent.markAdaptedIfSuggestion) - a one-way, sticky
      // transition that never reverts. Building `updated` fresh on every keystroke would otherwise
      // silently drop this field and make the "AI Feedback Suggestion" badge vanish instead of
      // turning into "Adapted AI Feedback Suggestion".
      feedbackSuggestion:
        existing?.feedbackSuggestion === "suggested"
          ? "adapted"
          : existing?.feedbackSuggestion,
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
    setTitle("")
    setScore("")
    setFeedback("")
  }

  return (
    <PopoverSection divider={divider}>
      {/* Reference row: which element this box is about — separate from the
          editable title below, same split as the host's unified feedback
          reference chip vs. its title field. */}
      <Typography
        variant="caption"
        style={{ opacity: 0.7, display: "flex", alignItems: "center", gap: 4 }}
      >
        {typeText}
        <span data-slot="assessment-name-chip">{name}</span>
      </Typography>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: ROW_GAP,
        }}
      >
        <TextField
          multiline
          minRows={1}
          maxLength={TITLE_MAX_LENGTH}
          value={title}
          onChange={(e) => {
            const value = e.target.value
            setTitle(value)
            updateAssessment(value, score, feedback)
          }}
          placeholder={defaultTitle}
          aria-label={t.assessmentFor(typeText)}
          data-field="assessment-title"
          fullWidth
        />
        <AssessmentScoreInput
          value={score}
          onChange={(value) => {
            setScore(value)
            updateAssessment(title, value, feedback)
          }}
          ariaLabel={t.points}
          placeholder="0"
        />
        <IconButton
          ariaLabel={t.deleteAssessmentFor(name)}
          tooltip={t.deleteAssessment}
          onClick={handleDelete}
        >
          <Trash2 width={16} height={16} aria-hidden="true" />
        </IconButton>
      </div>
      <TextField
        multiline
        minRows={3}
        maxLength={FEEDBACK_MAX_LENGTH}
        aria-label={t.feedback}
        helperText={`${feedback.length}/${FEEDBACK_MAX_LENGTH}`}
        value={feedback}
        onChange={(e) => {
          const value = e.target.value
          setFeedback(value)
          updateAssessment(title, score, value)
        }}
        placeholder={t.addComment}
        fullWidth
      />
      {existing?.feedbackSuggestion && (
        <div data-slot="assessment-suggestion-badge">
          <Sparkles width={14} height={14} aria-hidden="true" />
          <span>
            {existing.feedbackSuggestion === "adapted"
              ? t.adaptedAiFeedbackSuggestion
              : t.aiFeedbackSuggestion}
          </span>
        </div>
      )}
    </PopoverSection>
  )
}
