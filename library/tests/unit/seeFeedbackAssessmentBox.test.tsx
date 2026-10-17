import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import type { Assessment } from "@/typings"
import { DEFAULT_LABELS, mergeLabels } from "@/i18n/labels"

let assessments: Record<string, Assessment> = {}

vi.mock("@/store", () => ({
  useDiagramStore: (select: (state: unknown) => unknown) =>
    select({ getAssessment: (id: string) => assessments[id] }),
}))

vi.mock("@/i18n/useLabels", () => ({
  useLabels: () => mergeLabels(DEFAULT_LABELS),
}))

import { SeeFeedbackAssessmentBox } from "@/components/popovers/SeeFeedbackAssessmentBox"

const labels = mergeLabels(DEFAULT_LABELS)

const renderBox = () =>
  render(
    <SeeFeedbackAssessmentBox type="node" name="Person" elementId="element" />
  )

const feedbackLine = () =>
  document.querySelector<HTMLElement>('[data-slot="assessment-feedback"]')!

const assessment = (overrides: Partial<Assessment>): Assessment => ({
  modelElementId: "element",
  elementType: "node",
  score: 2,
  ...overrides,
})

describe("SeeFeedbackAssessmentBox", () => {
  beforeEach(() => {
    assessments = {}
  })

  it("shows the description the assessor wrote", () => {
    assessments.element = assessment({
      feedback: "Check the multiplicity.",
      dropInfo: { id: 7, credits: 2, feedback: "Correct association" },
    })
    renderBox()

    expect(feedbackLine()).toHaveTextContent("Check the multiplicity.")
    expect(feedbackLine()).not.toHaveTextContent("Correct association")
  })

  it("shows the linked instruction's text when the description is empty", () => {
    assessments.element = assessment({
      feedbackSuggestion: "adapted",
      dropInfo: { id: 7, credits: 2, feedback: "Correct association" },
    })
    renderBox()

    expect(feedbackLine()).toHaveTextContent("Correct association")
    expect(feedbackLine()).not.toHaveAttribute("data-empty")
  })

  it("shows no comment when neither a description nor an instruction text exists", () => {
    assessments.element = assessment({ dropInfo: { source: "custom" } })
    renderBox()

    expect(feedbackLine()).toHaveTextContent(labels.noComment)
    expect(feedbackLine()).toHaveAttribute("data-empty")
  })

  it("shows a toned badge in front of the title of a graded element, and none for an ungraded one", () => {
    const badge = () =>
      document.querySelector<HTMLElement>(
        '[data-slot="assessment-title-badge"]'
      )
    const row = () =>
      document.querySelector<HTMLElement>('[data-slot="assessment-title-row"]')!

    for (const [score, tone] of [
      [2, "positive"],
      [-1, "negative"],
      [0, "zero"],
    ] as const) {
      assessments.element = assessment({ score })
      const { unmount } = renderBox()
      expect(badge()).toHaveAttribute("data-tone", tone)
      expect(row()).toHaveAttribute("data-tone", tone)
      unmount()
    }

    assessments = {}
    renderBox()
    expect(badge()).toBeNull()
    expect(row()).not.toHaveAttribute("data-tone")
  })

  it("lets a long unbroken title wrap inside the popover instead of widening it", () => {
    assessments.element = assessment({ title: "Unbroken".repeat(40) })
    renderBox()

    const title = screen.getByText("Unbroken".repeat(40))
    expect(title).toHaveStyle({ minWidth: "0", overflowWrap: "anywhere" })
  })
})
