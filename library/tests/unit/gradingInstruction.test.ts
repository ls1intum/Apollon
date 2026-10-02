import { describe, expect, it } from "vitest"
import type { Assessment } from "@/typings"
import {
  gradingInstructionOf,
  linkGradingInstruction,
  unlinkGradingInstruction,
} from "@/utils/gradingInstruction"

const correct = { id: 7, credits: 2, feedback: "Correct association" }
const partial = { id: 8, credits: 1, feedback: "Association is incomplete" }

const assessment = (overrides: Partial<Assessment>): Assessment => ({
  modelElementId: "element",
  elementType: "node",
  score: 0,
  ...overrides,
})

describe("linkGradingInstruction", () => {
  it("writes the criterion's text into an element that has no assessment yet", () => {
    const linked = linkGradingInstruction(undefined, correct, "element", "node")

    expect(linked).toMatchObject({
      modelElementId: "element",
      elementType: "node",
      score: 2,
      feedback: "Correct association",
      dropInfo: correct,
    })
  })

  it("keeps the title and a description the assessor wrote", () => {
    const existing = assessment({
      title: "Association",
      score: 1,
      feedback: "Check the multiplicity.",
    })

    const linked = linkGradingInstruction(existing, correct, "element", "node")

    expect(linked.title).toBe("Association")
    expect(linked.feedback).toBe("Check the multiplicity.")
    expect(linked.score).toBe(2)
    expect(linked.dropInfo).toEqual(correct)
  })

  it("replaces the text a previously dropped criterion wrote", () => {
    const existing = linkGradingInstruction(
      undefined,
      correct,
      "element",
      "node"
    )

    const linked = linkGradingInstruction(existing, partial, "element", "node")

    expect(linked.feedback).toBe("Association is incomplete")
    expect(linked.score).toBe(1)
  })

  it("keeps the description of an AI suggestion and marks it adapted", () => {
    const existing = assessment({
      title: "Association",
      score: 3,
      feedback: "The association between Person and Car is right.",
      feedbackSuggestion: "suggested",
    })

    const linked = linkGradingInstruction(existing, correct, "element", "node")

    expect(linked.feedback).toBe(
      "The association between Person and Car is right."
    )
    expect(linked.feedbackSuggestion).toBe("adapted")
    expect(linked.dropInfo).toEqual(correct)
    expect(linked.score).toBe(2)
  })

  it("does not fill the empty description of an AI suggestion either", () => {
    const existing = assessment({ feedbackSuggestion: "suggested" })

    expect(
      linkGradingInstruction(existing, correct, "element", "node").feedback
    ).toBeUndefined()
  })
})

describe("unlinkGradingInstruction", () => {
  it("removes the grading instruction and keeps the points and the description", () => {
    const linked = linkGradingInstruction(undefined, correct, "element", "node")

    const unlinked = unlinkGradingInstruction(linked)

    expect(gradingInstructionOf(unlinked)).toBeUndefined()
    expect(unlinked.score).toBe(2)
    expect(unlinked.feedback).toBe("Correct association")
  })

  it("marks an AI suggestion as adapted and keeps an adapted one adapted", () => {
    const suggested = assessment({
      dropInfo: correct,
      feedbackSuggestion: "suggested",
    })
    const adapted = assessment({
      dropInfo: correct,
      feedbackSuggestion: "adapted",
    })

    expect(unlinkGradingInstruction(suggested).feedbackSuggestion).toBe(
      "adapted"
    )
    expect(unlinkGradingInstruction(adapted).feedbackSuggestion).toBe("adapted")
  })

  it("leaves an assessor's own assessment without a suggestion state", () => {
    const linked = linkGradingInstruction(undefined, correct, "element", "node")

    expect(unlinkGradingInstruction(linked).feedbackSuggestion).toBeUndefined()
  })
})

describe("linkGradingInstruction title", () => {
  const defaultTitles = ["Feedback", "Positive", "Needs Revision"]
  const dropped = { ...correct, criterionTitle: "Association" }

  it("names an element without a title after the instruction's criterion", () => {
    const linked = linkGradingInstruction(
      undefined,
      dropped,
      "element",
      "node",
      defaultTitles
    )

    expect(linked.title).toBe("Association")
    // The criterion's title only names the assessment and is not stored with the instruction
    expect(linked.dropInfo).toEqual(correct)
  })

  it("replaces a points-based default title", () => {
    const existing = assessment({ title: "Positive", score: 1 })

    expect(
      linkGradingInstruction(
        existing,
        dropped,
        "element",
        "node",
        defaultTitles
      ).title
    ).toBe("Association")
  })

  it("keeps a title the assessor wrote", () => {
    const existing = assessment({ title: "Car to Person", score: 1 })

    expect(
      linkGradingInstruction(
        existing,
        dropped,
        "element",
        "node",
        defaultTitles
      ).title
    ).toBe("Car to Person")
  })

  it("keeps the title of an AI suggestion", () => {
    const existing = assessment({
      title: "Class Modeling",
      feedbackSuggestion: "suggested",
    })

    expect(
      linkGradingInstruction(
        existing,
        dropped,
        "element",
        "node",
        defaultTitles
      ).title
    ).toBe("Class Modeling")
  })
})
