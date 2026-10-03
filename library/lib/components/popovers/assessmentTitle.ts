import { AssessmentTone } from "./AssessmentScoreInput"

/**
 * The default title shown for a box when no custom headline was typed —
 * shared by the give-feedback (editable placeholder) and see-feedback
 * (read-only fallback) boxes so the two can never drift apart. Mirrors the
 * host's unified feedback card (defaultTitlePlaceholder / feedbackTypeTitleKeys):
 * a zero/ungraded score reads as "Feedback", a positive one as "Positive", a
 * negative one as "Needs Revision" — independent of which element/type this
 * box is for.
 */
export const defaultTitleFor = (
  tone: AssessmentTone,
  t: { feedback: string; positiveFeedback: string; needsRevision: string }
): string => {
  if (tone === "positive") return t.positiveFeedback
  if (tone === "negative") return t.needsRevision
  return t.feedback
}

/** Same sign convention as {@link toneFor}, for a numeric score (possibly absent). */
export const toneForScore = (score: number | undefined): AssessmentTone => {
  if (score === undefined || score === 0) return "zero"
  return score > 0 ? "positive" : "negative"
}
