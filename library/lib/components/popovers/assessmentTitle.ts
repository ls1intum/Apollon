import type { ResolvedApollonLabels } from "@/i18n/labels"

export type AssessmentTone = "positive" | "negative" | "zero"

export const assessmentTone = (score: number): AssessmentTone =>
  score > 0 ? "positive" : score < 0 ? "negative" : "zero"

type TitleLabels = Pick<
  ResolvedApollonLabels,
  "feedback" | "positiveFeedback" | "needsRevision"
>

/** Shown while the title is empty; it follows the sign of the score. */
export const defaultAssessmentTitle = (
  tone: AssessmentTone,
  t: TitleLabels
): string =>
  tone === "positive"
    ? t.positiveFeedback
    : tone === "negative"
      ? t.needsRevision
      : t.feedback

/** Hosts may save the default title as the title; it still counts as none. */
export const isDefaultAssessmentTitle = (
  title: string | undefined,
  t: TitleLabels
): boolean =>
  !!title &&
  [t.feedback, t.positiveFeedback, t.needsRevision].includes(title.trim())
