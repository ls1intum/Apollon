import { useState, type FocusEvent } from "react"
import { Sparkles, Trash2, X } from "lucide-react"
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

  // Like the host's unified feedback card (applyDefaultTitleIfEmpty / refreshDefaultTitle), an edited
  // box never keeps an empty title: the default is written in once the box gets content or the title
  // field is left empty, and a title that is still one of the defaults follows the score's sign. A
  // title counts as default by its text, so this also holds for a reopened assessment. A title the
  // assessor typed is never touched.
  const isDefaultTitle = (value: string) =>
    [t.feedback, t.positiveFeedback, t.needsRevision].includes(value.trim())

  /** The title to store alongside `newScore`: filled if empty, kept in line with the sign if default. */
  const titleForScore = (currentTitle: string, newScore: string) =>
    currentTitle.trim() === "" || isDefaultTitle(currentTitle)
      ? defaultTitleFor(toneFor(newScore), t)
      : currentTitle

  const titleOrDefault = (currentTitle: string) =>
    currentTitle.trim() === "" ? defaultTitle : currentTitle

  // The description carries the comment, as the title is only a heading, so the host does not accept an
  // assessment without one. A grading instruction dropped on the element brings its own feedback as the
  // description, which makes it optional, like the host's Feedback.hasContent.
  const instructionFeedback = (
    existing?.dropInfo as { feedback?: string } | undefined
  )?.feedback
  const isDescriptionMissing =
    !!existing && feedback.trim() === "" && !instructionFeedback

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

  // Two-step delete, mirroring the host's unified feedback card (ConfirmIconComponent): the first click
  // arms the button (X turns into a trash icon), the second one deletes. Leaving the button disarms it.
  // A box with nothing in it has nothing to lose, so it is deleted on the first click, like the host's
  // canDismissWithoutConfirm.
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const isEmpty =
    title === "" &&
    (parseFloat(score) || 0) === 0 &&
    feedback === "" &&
    !existing?.feedbackSuggestion

  const handleDeleteClick = () => {
    if (confirmingDelete || isEmpty) {
      setConfirmingDelete(false)
      handleDelete()
    } else {
      setConfirmingDelete(true)
    }
  }
  const disarmDelete = () => setConfirmingDelete(false)
  // The editor moves focus to its root on every pointerdown, so pressing the armed button blurs it before
  // its click lands. A blur while the pointer is still over the button is that press, not the assessor
  // moving away (leaving with the mouse is handled by onMouseLeave, tabbing away still disarms).
  const disarmDeleteOnBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.matches(":hover")) disarmDelete()
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
          onBlur={() => {
            // Only an existing assessment gets a default title: leaving the empty title field of an element
            // that was never graded must not create an assessment for it.
            if (!existing || title.trim() !== "") return
            setTitle(defaultTitle)
            updateAssessment(defaultTitle, score, feedback)
          }}
          placeholder={defaultTitle}
          aria-label={t.assessmentFor(typeText)}
          data-field="assessment-title"
          fullWidth
        />
        <AssessmentScoreInput
          value={score}
          onChange={(value) => {
            const nextTitle = titleForScore(title, value)
            setScore(value)
            setTitle(nextTitle)
            updateAssessment(nextTitle, value, feedback)
          }}
          ariaLabel={t.points}
          placeholder="0"
        />
        <IconButton
          ariaLabel={
            confirmingDelete
              ? t.confirmDeleteAssessment
              : t.deleteAssessmentFor(name)
          }
          tooltip={
            confirmingDelete ? t.confirmDeleteAssessment : t.deleteAssessment
          }
          data-field="assessment-delete"
          data-confirming={confirmingDelete || undefined}
          onClick={handleDeleteClick}
          onMouseLeave={disarmDelete}
          onBlur={disarmDeleteOnBlur}
        >
          {confirmingDelete ? (
            <Trash2 width={16} height={16} aria-hidden="true" />
          ) : (
            <X width={16} height={16} aria-hidden="true" />
          )}
        </IconButton>
      </div>
      <TextField
        multiline
        minRows={3}
        maxLength={FEEDBACK_MAX_LENGTH}
        aria-label={t.feedback}
        error={isDescriptionMissing}
        helperText={`${feedback.length}/${FEEDBACK_MAX_LENGTH}`}
        value={feedback}
        onChange={(e) => {
          const value = e.target.value
          const nextTitle = titleOrDefault(title)
          setFeedback(value)
          setTitle(nextTitle)
          updateAssessment(nextTitle, score, value)
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
