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

describe("gradingInstructionOf", () => {
  it("accepts an instruction, including the host's null fields", () => {
    const fromHost = { ...correct, gradingScale: null }
    expect(gradingInstructionOf(assessment({ dropInfo: fromHost }))).toBe(
      fromHost
    )
  })

  it.each([
    ["host metadata without an id", { source: "custom" }],
    ["a field of the wrong type", { id: 1, criterionTitle: 42 }],
    ["an id of the wrong type", { id: "7" }],
    ["a string", "instruction"],
  ])("leaves %s opaque", (_name, dropInfo) => {
    expect(gradingInstructionOf(assessment({ dropInfo }))).toBeUndefined()
  })
})

describe("linkGradingInstruction", () => {
  it("creates an assessment with the instruction's points and feedback", () => {
    expect(
      linkGradingInstruction(undefined, correct, "element", "node")
    ).toMatchObject({ score: 2, feedback: "Correct association" })
  })

  it("keeps what the assessor wrote", () => {
    const existing = assessment({
      title: "Association",
      feedback: "Check the multiplicity.",
      label: "1st round",
    })

    expect(
      linkGradingInstruction(existing, correct, "element", "node")
    ).toMatchObject({
      title: "Association",
      feedback: "Check the multiplicity.",
      label: "1st round",
      score: 2,
      dropInfo: correct,
    })
  })

  it("replaces the previous instruction's feedback", () => {
    const linked = linkGradingInstruction(undefined, correct, "e", "node")

    expect(linkGradingInstruction(linked, partial, "e", "node")).toMatchObject({
      score: 1,
      feedback: "Association is incomplete",
    })
  })

  it("keeps an AI suggestion's description, even an empty one, and adapts it", () => {
    const linked = linkGradingInstruction(
      assessment({ feedbackSuggestion: "suggested" }),
      correct,
      "element",
      "node"
    )

    expect(linked.feedback).toBeUndefined()
    expect(linked.feedbackSuggestion).toBe("adapted")
  })
})

describe("unlinkGradingInstruction", () => {
  it("removes the instruction, keeps the points and adapts a suggestion", () => {
    const unlinked = unlinkGradingInstruction(
      assessment({
        score: 2,
        dropInfo: correct,
        feedbackSuggestion: "suggested",
      })
    )

    expect(unlinked.dropInfo).toBeUndefined()
    expect(unlinked).toMatchObject({ score: 2, feedbackSuggestion: "adapted" })
  })
})
