import type { Assessment, AssessmentGradingInstruction } from "@/typings"

const isOptional = (value: unknown, type: "number" | "string") =>
  value === undefined || value === null || typeof value === type

/**
 * `dropInfo` is opaque host metadata. Only a payload with a numeric `id` and
 * well-typed fields counts as a grading instruction; anything else stays
 * untouched.
 */
export const isGradingInstruction = (
  value: unknown
): value is AssessmentGradingInstruction => {
  if (typeof value !== "object" || value === null) return false
  const { id, credits, feedback, gradingScale, criterionTitle } =
    value as Record<string, unknown>
  return (
    typeof id === "number" &&
    isOptional(credits, "number") &&
    [feedback, gradingScale, criterionTitle].every((text) =>
      isOptional(text, "string")
    )
  )
}

export const gradingInstructionOf = (
  assessment: Assessment | undefined
): AssessmentGradingInstruction | undefined => {
  const dropInfo = assessment?.dropInfo
  return isGradingInstruction(dropInfo) ? dropInfo : undefined
}

/** Any change to a suggestion makes it adapted, for good. */
export const adaptedSuggestion = (
  feedbackSuggestion: Assessment["feedbackSuggestion"]
): Assessment["feedbackSuggestion"] => feedbackSuggestion && "adapted"

/**
 * Links the instruction and takes its points. Its feedback becomes the
 * description only where it overwrites nothing the assessor or an AI
 * suggestion wrote: an empty description or the previous instruction's text.
 */
export const linkGradingInstruction = (
  existing: Assessment | undefined,
  instruction: AssessmentGradingInstruction,
  elementId: string,
  elementType: string
): Assessment => {
  const replacesDescription =
    !existing?.feedbackSuggestion &&
    (!existing?.feedback ||
      existing.feedback === gradingInstructionOf(existing)?.feedback)

  return {
    ...existing,
    modelElementId: elementId,
    elementType: existing?.elementType ?? elementType,
    score: instruction.credits ?? existing?.score ?? 0,
    feedback: replacesDescription
      ? (instruction.feedback ?? undefined)
      : existing?.feedback,
    dropInfo: instruction,
    correctionStatus: { status: "NOT_VALIDATED" },
    feedbackSuggestion: adaptedSuggestion(existing?.feedbackSuggestion),
  }
}

/** Removes the link. The points stay and become editable again. */
export const unlinkGradingInstruction = ({
  dropInfo: _dropInfo,
  ...assessment
}: Assessment): Assessment => ({
  ...assessment,
  correctionStatus: { status: "NOT_VALIDATED" },
  feedbackSuggestion: adaptedSuggestion(assessment.feedbackSuggestion),
})
