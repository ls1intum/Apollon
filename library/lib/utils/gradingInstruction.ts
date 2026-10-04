import type { Assessment } from "@/typings"

/**
 * The parts of the host's grading instruction an assessment carries in `dropInfo` once the instruction was dropped on
 * its element (or the host linked it, e.g. for an AI feedback suggestion Athena matched to a criterion).
 */
export type GradingInstructionInfo = {
  id?: number
  credits?: number
  /** The criterion's feedback text, written for the student. */
  feedback?: string
  /** How the assessor should apply the instruction. */
  instructionDescription?: string
  /** The instruction's grading scale, e.g. "Partially correct", which the instructor may leave empty. */
  gradingScale?: string
  /**
   * The title of the instruction's criterion, which an instruction does not carry itself. The host adds it so the
   * assessment can name it (the give-feedback box shows it as "Linked to <criterion>") and strips it again.
   */
  criterionTitle?: string
}

/** The grading instruction linked to the assessment, if any. */
export const gradingInstructionOf = (
  assessment: Assessment | undefined
): GradingInstructionInfo | undefined => {
  const dropInfo = assessment?.dropInfo
  return dropInfo && typeof dropInfo === "object"
    ? (dropInfo as GradingInstructionInfo)
    : undefined
}

/**
 * An accepted suggestion turns adapted the moment it is changed, mirroring the host's
 * Feedback.markAdaptedIfAcceptedSuggestion. The transition is one-way.
 */
export const adaptedSuggestion = (
  feedbackSuggestion: Assessment["feedbackSuggestion"]
): Assessment["feedbackSuggestion"] =>
  feedbackSuggestion === "suggested" ? "adapted" : feedbackSuggestion

/**
 * Links an element's assessment to a dropped grading instruction, keeping everything else the assessor wrote, like the
 * host's StructuredGradingCriterionService.applyGradingInstruction: the assessment takes the instruction's points, and
 * an assessor's own assessment takes the criterion's text as its description, where it can be edited. The text
 * replaces an empty description or the one a previously linked instruction wrote, never what the assessor wrote. An AI
 * suggestion keeps its own description and becomes adapted. The student reads the description, or the criterion's
 * text when the description is empty. The criterion's title stays in `dropInfo` and names the assessment if its title
 * is empty or one of the points-based `defaultTitles`, so a title the assessor wrote and an AI suggestion's own title
 * stay.
 */
export const linkGradingInstruction = (
  existing: Assessment | undefined,
  instruction: GradingInstructionInfo,
  elementId: string,
  elementType: string,
  defaultTitles: readonly string[] = []
): Assessment => {
  const criterionTitle = instruction.criterionTitle?.trim()
  const previousInstructionText = gradingInstructionOf(existing)?.feedback
  const isAISuggestion = !!existing?.feedbackSuggestion
  const takesInstructionText =
    !isAISuggestion &&
    !!instruction.feedback &&
    (!existing?.feedback || existing.feedback === previousInstructionText)

  const existingTitle = existing?.title?.trim() ?? ""
  const hasDefaultTitle =
    existingTitle === "" || defaultTitles.includes(existingTitle)
  const title =
    criterionTitle && hasDefaultTitle ? criterionTitle : existing?.title

  return {
    ...existing,
    modelElementId: elementId,
    elementType: existing?.elementType ?? elementType,
    title,
    score: instruction.credits ?? existing?.score ?? 0,
    feedback: takesInstructionText ? instruction.feedback : existing?.feedback,
    dropInfo: instruction,
    correctionStatus: { status: "NOT_VALIDATED" },
    feedbackSuggestion: adaptedSuggestion(existing?.feedbackSuggestion),
  }
}

/**
 * Removes the grading instruction from an assessment. Its points stay, and become editable again; an accepted AI
 * suggestion becomes adapted, since it was changed.
 */
export const unlinkGradingInstruction = (
  assessment: Assessment
): Assessment => {
  const { dropInfo: _removed, ...rest } = assessment
  return {
    ...rest,
    correctionStatus: { status: "NOT_VALIDATED" },
    feedbackSuggestion: adaptedSuggestion(assessment.feedbackSuggestion),
  }
}
