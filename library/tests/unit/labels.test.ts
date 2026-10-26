import { describe, expect, it } from "vitest"
import { DEFAULT_LABELS, mergeLabels } from "@/i18n/labels"
import type { ApollonLabels } from "@/i18n/labels"

describe("mergeLabels", () => {
  it("fills labels introduced after a host's partial dictionary was written", () => {
    const labels = mergeLabels({ zoomIn: "Vergrößern" })

    expect(labels.zoomIn).toBe("Vergrößern")
    expect(labels.moveEdgeWaypoint).toBe(DEFAULT_LABELS.moveEdgeWaypoint)
  })

  it("keeps a complete dictionary from before the new host labels assignable", () => {
    const {
      scrollLockHint: _scrollLockHint,
      scrollLockHintTouch: _scrollLockHintTouch,
      previousAssessment: _previousAssessment,
      decreasePoints: _decreasePoints,
      increasePoints: _increasePoints,
      assessmentTitle: _assessmentTitle,
      positiveFeedback: _positiveFeedback,
      needsRevision: _needsRevision,
      feedbackRequired: _feedbackRequired,
      aiFeedbackSuggestion: _aiFeedbackSuggestion,
      adaptedAiFeedbackSuggestion: _adaptedAiFeedbackSuggestion,
      confirmDeleteAssessment: _confirmDeleteAssessment,
      linkedCriterion: _linkedCriterion,
      linkedCriterionFallback: _linkedCriterionFallback,
      removeLinkedCriterion: _removeLinkedCriterion,
      confirmRemoveLinkedCriterion: _confirmRemoveLinkedCriterion,
      ...legacyDictionary
    } = DEFAULT_LABELS
    const compatibleDictionary: ApollonLabels = legacyDictionary

    expect(mergeLabels(compatibleDictionary).scrollLockHintTouch).toBe(
      DEFAULT_LABELS.scrollLockHintTouch
    )
  })
})
