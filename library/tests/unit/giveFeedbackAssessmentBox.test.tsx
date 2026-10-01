import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import type { Assessment } from "@/typings"
import { DEFAULT_LABELS, mergeLabels } from "@/i18n/labels"

let assessments: Record<string, Assessment> = {}
const setAssessments = vi.fn(
  (
    update: (prev: Record<string, Assessment>) => Record<string, Assessment>
  ) => {
    assessments = update(assessments)
  }
)

vi.mock("@/store", () => ({
  useDiagramStore: (select: (state: unknown) => unknown) =>
    select({ assessments, setAssessments }),
}))

vi.mock("@/i18n/useLabels", () => ({
  useLabels: () => mergeLabels(DEFAULT_LABELS),
}))

import { GiveFeedbackAssessmentBox } from "@/components/popovers/GiveFeedbackAssessmentBox"
import { clampedScoreInput } from "@/components/popovers/AssessmentScoreInput"

const labels = mergeLabels(DEFAULT_LABELS)

const renderBox = () =>
  render(
    <GiveFeedbackAssessmentBox
      elementId="element"
      name="Person"
      elementType="node"
    />
  )

const deleteButton = () =>
  document.querySelector<HTMLButtonElement>('[data-field="assessment-delete"]')!

describe("GiveFeedbackAssessmentBox delete", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assessments = {}
  })

  it("asks for a second click before deleting an assessment with content", () => {
    assessments.element = {
      modelElementId: "element",
      elementType: "node",
      score: 2,
      feedback: "Good",
    }
    renderBox()

    fireEvent.click(deleteButton())
    expect(setAssessments).not.toHaveBeenCalled()
    expect(deleteButton()).toHaveAttribute("data-confirming")
    expect(deleteButton()).toHaveAttribute(
      "aria-label",
      labels.confirmDeleteAssessment
    )

    fireEvent.click(deleteButton())
    expect(assessments.element).toBeUndefined()
    expect(deleteButton()).not.toHaveAttribute("data-confirming")
  })

  it("disarms the delete button when the pointer leaves it", () => {
    assessments.element = {
      modelElementId: "element",
      elementType: "node",
      score: 2,
    }
    renderBox()

    fireEvent.click(deleteButton())
    fireEvent.mouseLeave(deleteButton())
    expect(deleteButton()).not.toHaveAttribute("data-confirming")

    fireEvent.click(deleteButton())
    expect(assessments.element).toBeDefined()
  })

  it("stays armed when pressing the button moves focus away from it", () => {
    assessments.element = {
      modelElementId: "element",
      elementType: "node",
      score: 2,
    }
    renderBox()

    fireEvent.click(deleteButton())
    // The editor focuses its root on pointerdown, so the armed button is blurred while the pointer is on it.
    const matches = vi
      .spyOn(deleteButton(), "matches")
      .mockImplementation((selector) => selector === ":hover")
    fireEvent.focusOut(deleteButton())
    matches.mockRestore()
    expect(deleteButton()).toHaveAttribute("data-confirming")

    fireEvent.click(deleteButton())
    expect(assessments.element).toBeUndefined()
  })

  it("disarms the delete button when focus moves away without the pointer on it", () => {
    assessments.element = {
      modelElementId: "element",
      elementType: "node",
      score: 2,
    }
    renderBox()

    fireEvent.click(deleteButton())
    // e.g. tabbing away: the pointer is not over the button
    const matches = vi
      .spyOn(deleteButton(), "matches")
      .mockImplementation(() => false)
    fireEvent.focusOut(deleteButton())
    matches.mockRestore()
    expect(deleteButton()).not.toHaveAttribute("data-confirming")
  })

  it("deletes an empty assessment on the first click", () => {
    assessments.element = {
      modelElementId: "element",
      elementType: "node",
      score: 0,
    }
    renderBox()

    fireEvent.click(deleteButton())
    expect(assessments.element).toBeUndefined()
  })
})

describe("GiveFeedbackAssessmentBox default title", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assessments = {}
  })

  const titleField = () =>
    screen.getByLabelText(labels.assessmentFor(labels.node))

  it("writes the default title once the box gets points and keeps it in line with the sign", () => {
    renderBox()

    fireEvent.change(screen.getByLabelText(labels.points), {
      target: { value: "2" },
    })
    expect(titleField()).toHaveValue(labels.positiveFeedback)
    expect(assessments.element.title).toBe(labels.positiveFeedback)

    fireEvent.change(screen.getByLabelText(labels.points), {
      target: { value: "-1" },
    })
    expect(assessments.element.title).toBe(labels.needsRevision)

    fireEvent.change(screen.getByLabelText(labels.points), {
      target: { value: "0" },
    })
    expect(assessments.element.title).toBe(labels.feedback)
  })

  it("writes the default title once the box gets a description", () => {
    renderBox()

    fireEvent.change(screen.getByLabelText(labels.feedback), {
      target: { value: "Missing multiplicity" },
    })
    expect(assessments.element.title).toBe(labels.feedback)
  })

  it("fills a title left empty when the field loses focus", () => {
    assessments.element = {
      modelElementId: "element",
      elementType: "node",
      score: 2,
    }
    renderBox()

    fireEvent.blur(titleField())
    expect(titleField()).toHaveValue(labels.positiveFeedback)
    expect(assessments.element.title).toBe(labels.positiveFeedback)
  })

  it("does not create an assessment when the empty title field of an ungraded element loses focus", () => {
    renderBox()

    fireEvent.focusOut(titleField())
    expect(titleField()).toHaveValue("")
    expect(assessments.element).toBeUndefined()
    expect(setAssessments).not.toHaveBeenCalled()
  })

  it("never rewrites a title the assessor typed", () => {
    renderBox()

    fireEvent.change(titleField(), { target: { value: "Wrong association" } })
    fireEvent.change(screen.getByLabelText(labels.points), {
      target: { value: "-1" },
    })
    fireEvent.blur(titleField())
    expect(assessments.element.title).toBe("Wrong association")
  })
})

describe("GiveFeedbackAssessmentBox description", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assessments = {}
  })

  const descriptionField = () => screen.getByLabelText(labels.feedback)

  it("flags a missing description once the element is assessed", () => {
    renderBox()
    expect(descriptionField()).not.toHaveAttribute("aria-invalid")

    fireEvent.change(screen.getByLabelText(labels.points), {
      target: { value: "2" },
    })
    expect(descriptionField()).toHaveAttribute("aria-invalid", "true")

    fireEvent.change(descriptionField(), {
      target: { value: "Missing multiplicity" },
    })
    expect(descriptionField()).not.toHaveAttribute("aria-invalid")
  })

  it("does not require a description when a grading instruction provides one", () => {
    assessments.element = {
      modelElementId: "element",
      elementType: "node",
      score: 1,
      dropInfo: { id: 7, feedback: "Correct association" },
    }
    renderBox()

    expect(descriptionField()).not.toHaveAttribute("aria-invalid")
  })
})

describe("GiveFeedbackAssessmentBox score bounds", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assessments = {}
  })

  it("clamps typed values to the range from -100 to 100", () => {
    expect(clampedScoreInput("99999")).toBe("100")
    expect(clampedScoreInput("-99999")).toBe("-100")
    expect(clampedScoreInput("42.5")).toBe("42.5")
    expect(clampedScoreInput("-")).toBe("-")
    expect(clampedScoreInput("")).toBe("")
  })

  it("stores a clamped score and disables the stepper at the bound", () => {
    renderBox()

    fireEvent.change(screen.getByLabelText(labels.points), {
      target: { value: "500" },
    })
    expect(assessments.element.score).toBe(100)
    expect(
      screen.getByRole("button", { name: labels.increasePoints })
    ).toBeDisabled()
    expect(
      screen.getByRole("button", { name: labels.decreasePoints })
    ).toBeEnabled()
  })
})
