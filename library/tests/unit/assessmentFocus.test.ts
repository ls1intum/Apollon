import { describe, expect, it } from "vitest"
import {
  applyAssessmentFocus,
  ASSESSMENT_FOCUS_CLASS,
} from "@/utils/assessmentFocus"

const elements = [{ id: "a" }, { id: "b", className: "existing" }] satisfies {
  id: string
  className?: string
}[]

describe("applyAssessmentFocus", () => {
  it("returns the same array reference when nothing is being assessed", () => {
    expect(applyAssessmentFocus(elements, null)).toBe(elements)
  })

  it("returns the same array reference when the focused id is not present", () => {
    // Nodes and edges are filtered separately, so each call sees an id that
    // belongs to the other collection half the time.
    expect(applyAssessmentFocus(elements, "missing")).toBe(elements)
  })

  it("marks only the assessed element", () => {
    const result = applyAssessmentFocus(elements, "a")
    expect(result[0].className).toBe(ASSESSMENT_FOCUS_CLASS)
    expect(result[1].className).toBe("existing")
  })

  it("preserves an existing className", () => {
    const result = applyAssessmentFocus(elements, "b")
    expect(result[1].className).toBe(`existing ${ASSESSMENT_FOCUS_CLASS}`)
  })

  it("does not mutate the input", () => {
    applyAssessmentFocus(elements, "a")
    expect(elements[0]).not.toHaveProperty("className")
  })
})
