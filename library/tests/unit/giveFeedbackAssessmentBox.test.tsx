import { beforeEach, describe, expect, it } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"
import * as Y from "yjs"
import type { Assessment } from "@/typings"
import { DEFAULT_LABELS, mergeLabels } from "@/i18n/labels"
import { DiagramStoreContext, MetadataStoreContext } from "@/store/context"
import { createDiagramStore } from "@/store/diagramStore"
import { createMetadataStore } from "@/store/metadataStore"
import { GiveFeedbackAssessmentBox } from "@/components/popovers/GiveFeedbackAssessmentBox"

const t = mergeLabels(DEFAULT_LABELS)
const instruction = {
  id: 7,
  credits: 2,
  feedback: "Correct association",
  gradingScale: "Correct",
  criterionTitle: "Association",
}

let diagramStore: ReturnType<typeof createDiagramStore>

const stored = () => diagramStore.getState().assessments.element
const store = (assessment: Partial<Assessment>) =>
  act(() =>
    diagramStore.getState().setAssessments({
      element: {
        modelElementId: "element",
        elementType: "node",
        score: 0,
        ...assessment,
      },
    })
  )

const renderBox = () => {
  const ydoc = new Y.Doc()
  return render(
    <DiagramStoreContext value={diagramStore}>
      <MetadataStoreContext value={createMetadataStore(ydoc)}>
        <GiveFeedbackAssessmentBox
          elementId="element"
          name="Person"
          elementType="node"
        />
      </MetadataStoreContext>
    </DiagramStoreContext>
  )
}

const titleField = () =>
  screen.getByRole("textbox", { name: t.assessmentTitle })
const pointsField = () => screen.getByRole("textbox", { name: t.points })
const descriptionField = () => screen.getByRole("textbox", { name: t.feedback })
const button = (name: string) => screen.getByRole("button", { name })
const typePoints = (value: string) => {
  fireEvent.change(pointsField(), { target: { value } })
  fireEvent.blur(pointsField())
}

beforeEach(() => {
  diagramStore = createDiagramStore(new Y.Doc())
})

describe("GiveFeedbackAssessmentBox title", () => {
  it("shows the default title for the sign of the points without storing it", () => {
    renderBox()

    typePoints("2")
    expect(stored().score).toBe(2)
    expect(stored().title).toBeUndefined()
    expect(titleField()).toHaveAttribute("placeholder", t.positiveFeedback)

    typePoints("-1")
    expect(titleField()).toHaveAttribute("placeholder", t.needsRevision)
  })

  it("lets a stored default title follow the points, but keeps a typed one", () => {
    store({ score: 2, title: t.positiveFeedback })
    renderBox()
    typePoints("-1")
    expect(stored().title).toBeUndefined()

    fireEvent.change(titleField(), { target: { value: "Wrong multiplicity" } })
    typePoints("1")
    expect(stored().title).toBe("Wrong multiplicity")
  })

  it("keeps the title on one line", () => {
    renderBox()

    fireEvent.change(titleField(), { target: { value: "Wrong\nmultiplicity" } })
    expect(stored().title).toBe("Wrong multiplicity")
  })

  it("keeps host fields on edit, resets the correction status and adapts a suggestion", () => {
    store({
      score: 2,
      label: "1st round",
      labelColor: "#00aa00",
      correctionStatus: { status: "CORRECT" },
      dropInfo: { source: "host" },
      feedbackSuggestion: "suggested",
    })
    renderBox()
    expect(screen.getByText(t.aiFeedbackSuggestion)).toBeInTheDocument()

    fireEvent.change(titleField(), { target: { value: "Association" } })

    expect(stored()).toMatchObject({
      title: "Association",
      label: "1st round",
      labelColor: "#00aa00",
      correctionStatus: { status: "NOT_VALIDATED" },
      dropInfo: { source: "host" },
      feedbackSuggestion: "adapted",
    })
    expect(screen.getByText(t.adaptedAiFeedbackSuggestion)).toBeInTheDocument()
  })
})

describe("GiveFeedbackAssessmentBox points", () => {
  it("leaves an assessment untouched when its fields are only visited", () => {
    store({ score: 2, title: "Association", feedbackSuggestion: "suggested" })
    const before = stored()
    renderBox()

    for (const field of [titleField(), pointsField(), descriptionField()]) {
      fireEvent.focus(field)
      fireEvent.blur(field)
    }
    expect(stored()).toBe(before)
  })

  it("steps onto the half-point grid", () => {
    store({ score: 1.3 })
    renderBox()

    fireEvent.click(button(t.increasePoints))
    expect(stored().score).toBe(1.5)
  })

  it("limits the points to 100", () => {
    renderBox()

    typePoints("500")
    expect(stored().score).toBe(100)
    expect(button(t.increasePoints)).toBeDisabled()
  })
})

describe("GiveFeedbackAssessmentBox delete", () => {
  it("deletes an assessment with content on the second click", () => {
    store({ score: 2, feedback: "Good" })
    renderBox()

    fireEvent.click(button(t.deleteAssessmentFor("Person")))
    expect(stored()).toBeDefined()

    fireEvent.click(button(t.confirmDeleteAssessment))
    expect(stored()).toBeUndefined()
  })

  it("disarms when the pointer leaves the button", () => {
    store({ score: 2 })
    renderBox()

    fireEvent.click(button(t.deleteAssessmentFor("Person")))
    fireEvent.mouseLeave(button(t.confirmDeleteAssessment))
    fireEvent.click(button(t.deleteAssessmentFor("Person")))
    expect(stored()).toBeDefined()
  })

  it("disarms when keyboard focus leaves the button", () => {
    store({ score: 2 })
    renderBox()

    fireEvent.click(button(t.deleteAssessmentFor("Person")))
    fireEvent.blur(button(t.confirmDeleteAssessment))
    fireEvent.click(button(t.deleteAssessmentFor("Person")))
    expect(stored()).toBeDefined()
  })

  it("stays armed when a pointer press on it moves focus away", () => {
    store({ score: 2 })
    renderBox()

    fireEvent.click(button(t.deleteAssessmentFor("Person")))
    const armed = button(t.confirmDeleteAssessment)
    fireEvent.pointerDown(armed)
    fireEvent.blur(armed)
    fireEvent.click(armed)
    expect(stored()).toBeUndefined()
  })

  it("deletes an empty assessment on the first click", () => {
    store({ score: 0 })
    renderBox()

    fireEvent.click(button(t.deleteAssessmentFor("Person")))
    expect(stored()).toBeUndefined()
  })
})

describe("GiveFeedbackAssessmentBox description", () => {
  it("asks for a description once the element is assessed", () => {
    renderBox()
    expect(descriptionField()).toBeValid()

    typePoints("2")
    expect(descriptionField()).toBeInvalid()
    expect(descriptionField()).toHaveAccessibleDescription(t.feedbackRequired)

    fireEvent.change(descriptionField(), { target: { value: "Good" } })
    expect(descriptionField()).toBeValid()
  })

  it("does not ask for one when a linked instruction brings feedback", () => {
    store({ score: 2, dropInfo: instruction })
    renderBox()

    expect(descriptionField()).toBeValid()
  })
})

describe("GiveFeedbackAssessmentBox grading instruction", () => {
  it("names the criterion and scale and locks the points", () => {
    store({ score: 2, dropInfo: instruction })
    renderBox()

    expect(screen.getByRole("img", { name: t.linkedCriterion })).toBeVisible()
    expect(screen.getByText("Association")).toBeVisible()
    expect(screen.getByText("Correct")).toBeVisible()
    expect(pointsField()).toBeDisabled()
  })

  it("leaves the points editable for other host metadata", () => {
    store({ score: 2, dropInfo: { source: "host", criterionTitle: 42 } })
    renderBox()

    expect(pointsField()).toBeEnabled()
    expect(screen.queryByRole("img", { name: t.linkedCriterion })).toBeNull()
  })

  it("keeps the link when the description is edited", () => {
    store({ score: 2, dropInfo: instruction })
    renderBox()

    fireEvent.change(descriptionField(), { target: { value: "Well done" } })
    expect(stored().dropInfo).toEqual(instruction)
  })

  it("shows an instruction linked while the box is open", () => {
    store({ score: 1 })
    renderBox()

    store({ score: 2, feedback: "Correct association", dropInfo: instruction })
    expect(pointsField()).toHaveValue("2")
    expect(descriptionField()).toHaveValue("Correct association")
  })

  it("removes the link on the second click, keeping the points", () => {
    store({ score: 2, dropInfo: instruction, feedbackSuggestion: "suggested" })
    renderBox()

    fireEvent.click(button(t.removeLinkedCriterion))
    expect(stored().dropInfo).toEqual(instruction)

    fireEvent.click(button(t.confirmRemoveLinkedCriterion))
    expect(stored()).toMatchObject({ score: 2, feedbackSuggestion: "adapted" })
    expect(stored().dropInfo).toBeUndefined()
    expect(pointsField()).toBeEnabled()
  })
})
