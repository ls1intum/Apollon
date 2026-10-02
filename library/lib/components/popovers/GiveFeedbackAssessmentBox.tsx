import { useEffect, useRef, useState, type FocusEvent } from "react"
import { Link, Sparkles, Trash2, Unlink, X } from "lucide-react"
import { useDiagramStore } from "@/store"
import { Assessment } from "@/typings"
import { useShallow } from "zustand/shallow"
import {
  IconButton,
  TextField,
  Tooltip,
  TooltipProvider,
  Typography,
} from "../ui"
import { useLabels } from "@/i18n/useLabels"
import { PopoverSection } from "./PopoverLayout"
import { AssessmentScoreInput, toneFor } from "./AssessmentScoreInput"
import { defaultTitleFor } from "./assessmentTitle"
import {
  adaptedSuggestion,
  gradingInstructionOf,
  unlinkGradingInstruction,
} from "@/utils/gradingInstruction"

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

/**
 * Tooltip delay inside the box. The editor waits 700ms so tooltips do not pop up while the pointer crosses the canvas, but
 * the box's controls are aimed at, and the host's unified feedback card, which this box mirrors, opens its tooltips after 150ms.
 */
const TOOLTIP_DELAY = 150

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

  // A grading instruction dropped on the element (or unlinked) while the box is open changes its points, description and
  // title in the store. The fields are read from the store again then; otherwise the next edit would write their stale
  // values back, and the host drops the link of an assessment whose points no longer match its instruction. Edits made in
  // the box carry the same dropInfo object along, so they do not trigger this.
  const [syncedDropInfo, setSyncedDropInfo] = useState(existing?.dropInfo)
  if (existing?.dropInfo !== syncedDropInfo) {
    setSyncedDropInfo(existing?.dropInfo)
    setTitle(existing?.title ?? "")
    setScore(existing?.score?.toString() ?? "")
    setFeedback(existing?.feedback ?? "")
  }

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
  const instruction = gradingInstructionOf(existing)
  const instructionFeedback = instruction?.feedback
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
      // `updated` is built fresh on every keystroke, so everything an edit does not change is carried over here.
      // Dropping the grading instruction would unlink it from the assessment on any edit (the host drops the link of
      // an assessment that comes back without it).
      dropInfo: existing?.dropInfo,
      // A suggestion transitions to adapted the moment it is touched, mirroring the host's unified
      // feedback card (see UnifiedFeedbackComponent.markAdaptedIfSuggestion) - a one-way, sticky
      // transition that never reverts. Dropping the field would make the "AI Feedback Suggestion" badge
      // vanish instead of turning into "Adapted AI Feedback Suggestion".
      feedbackSuggestion: adaptedSuggestion(existing?.feedbackSuggestion),
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

  // The link to a grading instruction is removed in two steps as well, like the remove control of the host's linked
  // criterion chip: a first click arms the X (it turns into an unlink icon), the second one removes the link. The points
  // stay and become editable again, and an AI suggestion becomes adapted (see unlinkGradingInstruction).
  const [confirmingUnlink, setConfirmingUnlink] = useState(false)
  const handleUnlinkClick = () => {
    if (!confirmingUnlink) {
      setConfirmingUnlink(true)
      return
    }
    setConfirmingUnlink(false)
    setAssessments((prev) =>
      prev[elementId]
        ? { ...prev, [elementId]: unlinkGradingInstruction(prev[elementId]) }
        : prev
    )
  }
  const disarmUnlink = () => setConfirmingUnlink(false)
  const disarmUnlinkOnBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.matches(":hover")) disarmUnlink()
  }

  // Like the host's unified feedback card, a linked assessment names its criterion in a "Linked to" chip next to the
  // element. The student reads the description, or the criterion's text when the description is empty.
  // A named criterion is followed by "Criterion"; the generic fallback name already says it.
  const criterionTitle = instruction?.criterionTitle?.trim()
  const linkedCriterionTitle = criterionTitle || t.linkedCriterionFallback
  // Once a narrow box cuts the criterion's name or grading scale off, the chip's tooltip repeats the chip in full, e.g.
  // "Linked to Association Criterion | Correct". The chip comes and goes with the instruction, so the measurement follows
  // it. It watches the chip, which stays put, and looks the title and scale up each time: they are re-mounted once a
  // tooltip wraps them.
  const hasInstruction = !!instruction
  // The grading scale, e.g. "Partially correct", sits in its own segment behind the criterion, so any wording reads on its own.
  // A long one is cut off like the criterion's name, but never takes more than half the chip.
  const gradingScale = instruction?.gradingScale?.trim()
  const linkedCriterionRef = useRef<HTMLSpanElement>(null)
  const [linkedCriterionTruncated, setLinkedCriterionTruncated] =
    useState(false)
  useEffect(() => {
    const chip = linkedCriterionRef.current
    if (!chip) {
      setLinkedCriterionTruncated(false)
      return
    }
    const measure = () => {
      const segments = chip.querySelectorAll<HTMLElement>(
        '[data-slot="assessment-linked-criterion-title"], [data-slot="assessment-linked-criterion-scale"]'
      )
      setLinkedCriterionTruncated(
        Array.from(segments).some(
          (segment) => segment.scrollWidth > segment.clientWidth
        )
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(chip)
    return () => observer.disconnect()
  }, [hasInstruction, linkedCriterionTitle, gradingScale])
  const criterionTooltip = linkedCriterionTruncated
    ? [
        t.linkedCriterion,
        linkedCriterionTitle,
        criterionTitle ? t.linkedCriterionSuffix : undefined,
      ]
        .filter(Boolean)
        .join(" ") + (gradingScale ? ` | ${gradingScale}` : "")
    : ""

  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY}>
      <PopoverSection divider={divider}>
        {/* Reference row: which element this box is about — separate from the
          editable title below, same split as the host's unified feedback
          reference chip vs. its title field. */}
        <Typography
          variant="caption"
          style={{
            opacity: 0.7,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 4,
            minWidth: 0,
          }}
        >
          {typeText}
          <span data-slot="assessment-name-chip">{name}</span>
          {instruction && (
            <span
              ref={linkedCriterionRef}
              data-slot="assessment-linked-criterion"
            >
              <Tooltip title={criterionTooltip}>
                <span data-slot="assessment-linked-criterion-text">
                  <Link width={12} height={12} aria-hidden="true" />
                  <span data-slot="assessment-linked-criterion-label">
                    {t.linkedCriterion}
                  </span>
                  <span data-slot="assessment-linked-criterion-title">
                    {linkedCriterionTitle}
                  </span>
                  {criterionTitle && (
                    <span data-slot="assessment-linked-criterion-suffix">
                      {t.linkedCriterionSuffix}
                    </span>
                  )}
                </span>
              </Tooltip>
              {gradingScale && (
                <Tooltip title={criterionTooltip}>
                  <span data-slot="assessment-linked-criterion-scale">
                    {gradingScale}
                  </span>
                </Tooltip>
              )}
              <IconButton
                ariaLabel={
                  confirmingUnlink
                    ? t.removeGradingInstruction
                    : t.removeLinkedCriterion
                }
                tooltip={
                  confirmingUnlink
                    ? t.removeGradingInstruction
                    : t.removeLinkedCriterion
                }
                data-field="assessment-grading-instruction"
                data-confirming={confirmingUnlink || undefined}
                onClick={handleUnlinkClick}
                onMouseLeave={disarmUnlink}
                onBlur={disarmUnlinkOnBlur}
              >
                {confirmingUnlink ? (
                  <Unlink width={12} height={12} aria-hidden="true" />
                ) : (
                  <X width={12} height={12} aria-hidden="true" />
                )}
              </IconButton>
            </span>
          )}
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
            disabled={!!instruction}
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
    </TooltipProvider>
  )
}
