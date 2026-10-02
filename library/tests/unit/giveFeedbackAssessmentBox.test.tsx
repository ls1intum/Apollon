import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"
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
import { linkGradingInstruction } from "@/utils/gradingInstruction"

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

describe("GiveFeedbackAssessmentBox grading instruction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assessments = {}
  })

  const instruction = {
    id: 7,
    credits: 2,
    feedback: "Correct association",
    instructionDescription: "The association is modelled correctly",
  }
  const descriptionField = () => screen.getByLabelText(labels.feedback)
  const linkButton = () =>
    document.querySelector<HTMLButtonElement>(
      '[data-field="assessment-grading-instruction"]'
    )
  const linkedCriterionChip = () =>
    document.querySelector('[data-slot="assessment-linked-criterion"]')

  it("opens the chip's tooltip after the box's short delay, not the editor's", async () => {
    vi.useFakeTimers()
    try {
      assessments.element = {
        modelElementId: "element",
        elementType: "node",
        score: 2,
        dropInfo: { ...instruction, criterionTitle: "Association" },
      }
      renderBox()
      const tooltipText = labels.gradingInstructionFor!(
        instruction.instructionDescription
      )
      const chipText = document.querySelector(
        '[data-slot="assessment-linked-criterion-text"]'
      )!

      fireEvent.mouseEnter(chipText)
      fireEvent.mouseMove(chipText)
      await act(async () => {
        vi.advanceTimersByTime(100)
      })
      expect(document.body).not.toHaveTextContent(tooltipText)

      // The editor's own 700ms delay would keep it closed well past this point
      await act(async () => {
        vi.advanceTimersByTime(100)
      })
      expect(document.body).toHaveTextContent(tooltipText)
    } finally {
      vi.useRealTimers()
    }
  })

  it("keeps the grading instruction when the description is edited", () => {
    // The host unlinks an assessment that comes back without its grading instruction.
    assessments.element = {
      modelElementId: "element",
      elementType: "node",
      score: 2,
      feedback: "Correct association",
      dropInfo: instruction,
    }
    renderBox()

    fireEvent.change(descriptionField(), {
      target: { value: "Correct association, well done" },
    })

    expect(assessments.element.dropInfo).toEqual(instruction)
  })

  it("locks the points while a grading instruction sets them", () => {
    assessments.element = {
      modelElementId: "element",
      elementType: "node",
      score: 2,
      dropInfo: instruction,
    }
    renderBox()

    expect(screen.getByLabelText(labels.points)).toBeDisabled()
    expect(
      screen.getByRole("button", { name: labels.increasePoints })
    ).toBeDisabled()
    expect(
      screen.getByRole("button", { name: labels.decreasePoints })
    ).toBeDisabled()
  })

  it("names the linked criterion in a chip next to the element", () => {
    assessments.element = {
      modelElementId: "element",
      elementType: "node",
      score: 2,
      feedback: "Correct association",
      dropInfo: { ...instruction, criterionTitle: "  Association  " },
    }
    renderBox()

    expect(linkedCriterionChip()).toHaveTextContent(
      `${labels.linkedCriterion}Association${labels.linkedCriterionSuffix}`
    )
    expect(
      linkedCriterionChip()!.querySelector(
        '[data-slot="assessment-linked-criterion-title"]'
      )
    ).toHaveTextContent(/^Association$/)
    // The criterion's text is no longer repeated above the description
    expect(
      document.querySelector('[data-slot="assessment-grading-instruction"]')
    ).toBeNull()
  })

  it("names the criterion generically when the host provides no title", () => {
    assessments.element = {
      modelElementId: "element",
      elementType: "node",
      score: 2,
      dropInfo: { ...instruction, criterionTitle: " " },
    }
    renderBox()

    expect(
      linkedCriterionChip()!.querySelector(
        '[data-slot="assessment-linked-criterion-title"]'
      )
    ).toHaveTextContent(labels.linkedCriterionFallback)
    // The fallback already reads "Assessment Criterion", so it is not followed by the suffix again
    expect(
      linkedCriterionChip()!.querySelector(
        '[data-slot="assessment-linked-criterion-suffix"]'
      )
    ).toBeNull()
  })

  it("shows no linked criterion chip without a grading instruction", () => {
    assessments.element = {
      modelElementId: "element",
      elementType: "node",
      score: 2,
      feedback: "Good",
    }
    renderBox()

    expect(linkedCriterionChip()).toBeNull()
    expect(linkButton()).toBeNull()
  })

  it("removes the link in two steps, keeping the points and unlocking them", () => {
    assessments.element = {
      modelElementId: "element",
      elementType: "node",
      score: 2,
      feedback: "Correct association",
      dropInfo: instruction,
    }
    renderBox()

    // The remove control sits inside the chip
    expect(linkedCriterionChip()).toContainElement(linkButton())
    expect(linkButton()).toHaveAttribute(
      "aria-label",
      labels.removeLinkedCriterion
    )
    fireEvent.click(linkButton()!)
    expect(assessments.element.dropInfo).toEqual(instruction)
    expect(linkButton()).toHaveAttribute(
      "aria-label",
      labels.removeGradingInstruction
    )

    fireEvent.click(linkButton()!)
    expect(assessments.element.dropInfo).toBeUndefined()
    expect(assessments.element.score).toBe(2)
    expect(linkButton()).toBeNull()
    expect(linkedCriterionChip()).toBeNull()
    expect(screen.getByLabelText(labels.points)).toBeEnabled()
  })

  it("takes over a grading instruction dropped while the box is open, so the next edit keeps it", () => {
    // The host drops the link of an assessment whose points no longer match its instruction.
    assessments.element = {
      modelElementId: "element",
      elementType: "node",
      score: 1,
      feedback: "",
    }
    const { rerender } = renderBox()

    assessments.element = linkGradingInstruction(
      assessments.element,
      instruction,
      "element",
      "node"
    )
    rerender(
      <GiveFeedbackAssessmentBox
        elementId="element"
        name="Person"
        elementType="node"
      />
    )

    expect(screen.getByLabelText(labels.points)).toHaveValue(2)
    expect(screen.getByLabelText(labels.points)).toBeDisabled()
    expect(descriptionField()).toHaveValue("Correct association")

    fireEvent.change(descriptionField(), {
      target: { value: "Correct association, well done" },
    })

    expect(assessments.element.score).toBe(2)
    expect(assessments.element.dropInfo).toEqual(instruction)
  })

  it("marks an AI suggestion as adapted when its grading instruction is removed", () => {
    assessments.element = {
      modelElementId: "element",
      elementType: "node",
      score: 2,
      feedback: "The association between Person and Car is right.",
      dropInfo: instruction,
      feedbackSuggestion: "suggested",
    }
    renderBox()

    fireEvent.click(linkButton()!)
    fireEvent.click(linkButton()!)

    expect(assessments.element.feedbackSuggestion).toBe("adapted")
    expect(assessments.element.feedback).toBe(
      "The association between Person and Car is right."
    )
  })
})
