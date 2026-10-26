import { useId, useState } from "react"
import { Link, Trash2, Unlink, WandSparkles, X } from "lucide-react"
import { useDiagramStore } from "@/store"
import { Assessment } from "@/typings"
import { useShallow } from "zustand/shallow"
import { IconButton, TextField, Tooltip } from "../ui"
import { useLabels } from "@/i18n/useLabels"
import { AssessmentReference, PopoverSection } from "./PopoverLayout"
import { AssessmentScoreInput } from "./AssessmentScoreInput"
import { AssessmentTitleBadge } from "./AssessmentTitleBadge"
import {
  assessmentTone,
  defaultAssessmentTitle,
  isDefaultAssessmentTitle,
} from "./assessmentTitle"
import {
  adaptedSuggestion,
  gradingInstructionOf,
  unlinkGradingInstruction,
} from "@/utils/gradingInstruction"

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

/** A title is a headline, not a paragraph. */
const TITLE_MAX_LENGTH = 100

/** Arms on the first click and runs `action` on the second; leaving disarms. */
const useTwoStepConfirm = (action: () => void, skip = false) => {
  const [armed, setArmed] = useState(false)
  return {
    armed,
    buttonProps: {
      "data-confirming": armed || undefined,
      onClick: () => {
        if (armed || skip) {
          setArmed(false)
          action()
        } else {
          setArmed(true)
        }
      },
      onMouseLeave: () => setArmed(false),
    },
  }
}

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
  const referenceId = useId()
  const { assessments, setAssessments } = useDiagramStore(
    useShallow((state) => ({
      assessments: state.assessments,
      setAssessments: state.setAssessments,
    }))
  )

  const existing = assessments[elementId]
  const title = existing?.title ?? ""
  const feedback = existing?.feedback ?? ""
  const tone = assessmentTone(existing?.score ?? 0)
  const instruction = gradingInstructionOf(existing)
  // The linked instruction's feedback stands in for a missing description.
  const isDescriptionMissing =
    !!existing && feedback.trim() === "" && !instruction?.feedback

  const updateAssessment = (changes: Partial<Assessment>) => {
    setAssessments((prev) => {
      const current: Assessment | undefined = prev[elementId]
      return {
        ...prev,
        [elementId]: {
          ...(current ?? { modelElementId: elementId, elementType, score: 0 }),
          ...changes,
          correctionStatus: { status: "NOT_VALIDATED" },
          feedbackSuggestion: adaptedSuggestion(current?.feedbackSuggestion),
        },
      }
    })
  }

  const isEmpty =
    !existing ||
    (title === "" &&
      existing.score === 0 &&
      feedback === "" &&
      !existing.feedbackSuggestion)
  const deleteConfirm = useTwoStepConfirm(() => {
    setAssessments(({ [elementId]: _, ...rest }) => rest)
  }, isEmpty)
  const unlinkConfirm = useTwoStepConfirm(() => {
    setAssessments((prev) =>
      prev[elementId]
        ? { ...prev, [elementId]: unlinkGradingInstruction(prev[elementId]) }
        : prev
    )
  })

  const criterionTitle =
    instruction?.criterionTitle?.trim() || t.linkedCriterionFallback
  const gradingScale = instruction?.gradingScale?.trim()
  // A narrow popover cuts the chip's text off; the tooltip shows it in full.
  const criterionTooltip = [
    `${t.linkedCriterion} ${criterionTitle}`,
    gradingScale,
  ]
    .filter(Boolean)
    .join(" | ")

  return (
    <PopoverSection divider={divider} aria-labelledby={referenceId}>
      <AssessmentReference
        id={referenceId}
        type={typeLabel ?? ELEMENT_TYPE_LABEL[elementType]}
        name={name}
      >
        {instruction && (
          <span data-slot="assessment-linked-criterion">
            <Tooltip title={criterionTooltip}>
              <span data-slot="assessment-linked-criterion-text">
                <Link
                  width={12}
                  height={12}
                  role="img"
                  aria-label={t.linkedCriterion}
                />
                <span data-slot="assessment-linked-criterion-title">
                  {criterionTitle}
                </span>
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
                unlinkConfirm.armed
                  ? t.confirmRemoveLinkedCriterion
                  : t.removeLinkedCriterion
              }
              tooltip={
                unlinkConfirm.armed
                  ? t.confirmRemoveLinkedCriterion
                  : t.removeLinkedCriterion
              }
              data-field="assessment-unlink"
              {...unlinkConfirm.buttonProps}
            >
              {unlinkConfirm.armed ? (
                <Unlink width={12} height={12} aria-hidden="true" />
              ) : (
                <X width={12} height={12} aria-hidden="true" />
              )}
            </IconButton>
          </span>
        )}
      </AssessmentReference>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <AssessmentTitleBadge tone={tone} />
        <TextField
          multiline
          minRows={1}
          maxLength={TITLE_MAX_LENGTH}
          value={title}
          onChange={(e) =>
            updateAssessment({
              // A heading stays on one line; long titles wrap instead.
              title: e.target.value.replace(/\s*\n\s*/g, " ") || undefined,
            })
          }
          placeholder={defaultAssessmentTitle(tone, t)}
          aria-label={t.assessmentTitle}
          data-field="assessment-title"
          data-tone={tone}
          fullWidth
          style={{ minWidth: 0 }}
        />
        <AssessmentScoreInput
          value={existing ? existing.score : null}
          onChange={(value) =>
            updateAssessment({
              score: value ?? 0,
              // A default title keeps following the sign of the score.
              ...(isDefaultAssessmentTitle(title, t) && { title: undefined }),
            })
          }
          disabled={!!instruction}
        />
        <IconButton
          ariaLabel={
            deleteConfirm.armed
              ? t.confirmDeleteAssessment
              : t.deleteAssessmentFor(name)
          }
          tooltip={
            deleteConfirm.armed ? t.confirmDeleteAssessment : t.deleteAssessment
          }
          data-field="assessment-delete"
          {...deleteConfirm.buttonProps}
        >
          {deleteConfirm.armed ? (
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
        helperText={
          isDescriptionMissing
            ? t.feedbackRequired
            : `${feedback.length}/${FEEDBACK_MAX_LENGTH}`
        }
        value={feedback}
        onChange={(e) =>
          updateAssessment({ feedback: e.target.value || undefined })
        }
        placeholder={t.addComment}
        fullWidth
      />
      {existing?.feedbackSuggestion && (
        <div data-slot="assessment-suggestion-badge">
          <WandSparkles
            width={14}
            height={14}
            fill="currentColor"
            aria-hidden="true"
          />
          {existing.feedbackSuggestion === "adapted"
            ? t.adaptedAiFeedbackSuggestion
            : t.aiFeedbackSuggestion}
        </div>
      )}
    </PopoverSection>
  )
}
