import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import * as Y from "yjs"
import type { Assessment } from "@/typings"
import { DEFAULT_LABELS, mergeLabels } from "@/i18n/labels"
import { DiagramStoreContext, MetadataStoreContext } from "@/store/context"
import { createDiagramStore } from "@/store/diagramStore"
import { createMetadataStore } from "@/store/metadataStore"
import { SeeFeedbackAssessmentBox } from "@/components/popovers/SeeFeedbackAssessmentBox"

const t = mergeLabels(DEFAULT_LABELS)

const renderBox = (assessment?: Partial<Assessment>) => {
  const diagramStore = createDiagramStore(new Y.Doc())
  if (assessment) {
    diagramStore.getState().setAssessments({
      element: {
        modelElementId: "element",
        elementType: "node",
        score: 2,
        ...assessment,
      },
    })
  }
  return render(
    <DiagramStoreContext value={diagramStore}>
      <MetadataStoreContext value={createMetadataStore(new Y.Doc())}>
        <SeeFeedbackAssessmentBox
          type="Class"
          name="Person"
          elementId="element"
        />
      </MetadataStoreContext>
    </DiagramStoreContext>
  )
}

describe("SeeFeedbackAssessmentBox", () => {
  it("shows the title, points and description", () => {
    renderBox({ title: "Association", feedback: "Check the multiplicity." })

    expect(screen.getByText("Association")).toBeVisible()
    expect(screen.getByText("+2")).toBeVisible()
    expect(screen.getByText("Check the multiplicity.")).toBeVisible()
  })

  it("shows the default title for the sign of the points", () => {
    renderBox({ score: -1, feedback: "Missing" })

    expect(screen.getByText(t.needsRevision)).toBeVisible()
  })

  it("shows the linked instruction's feedback when the description is empty", () => {
    renderBox({ dropInfo: { id: 7, feedback: "Correct association" } })

    expect(screen.getByText("Correct association")).toBeVisible()
  })

  it("says so when there is no description", () => {
    renderBox({ dropInfo: { source: "host" } })

    expect(screen.getByText(t.noComment)).toBeVisible()
  })

  it("shows only the not graded state for an ungraded element", () => {
    renderBox()

    expect(screen.getAllByText(t.notGraded)).toHaveLength(1)
    expect(screen.queryByText(t.noComment)).toBeNull()
  })
})
