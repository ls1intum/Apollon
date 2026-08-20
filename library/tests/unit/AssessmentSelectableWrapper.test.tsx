import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/hooks/useAssessmentSelection", () => ({
  useAssessmentSelection: () => ({
    isSelected: true,
    isHighlighted: false,
    showAssessmentInteraction: true,
    handleElementClick: vi.fn(),
    handleElementMouseEnter: vi.fn(),
    handleElementMouseLeave: vi.fn(),
  }),
}))

vi.mock("@/store", () => ({
  useMetadataStore: (selector: (state: unknown) => unknown) =>
    selector({ mode: "Assessment", readonly: true, view: "Modelling" }),
  useDiagramStore: (selector: (state: unknown) => unknown) =>
    selector({
      interactiveElements: {},
      interactiveRelationships: {},
      toggleInteractiveElement: vi.fn(),
    }),
  useAssessmentSelectionStore: (selector: (state: unknown) => unknown) =>
    selector({ highlightedElements: {} }),
}))

import { AssessmentSelectableWrapper } from "@/components/wrapper/AssessmentSelectableWrapper"

describe("AssessmentSelectableWrapper", () => {
  it("applies the selected assessment highlight to div-wrapped nodes", () => {
    const { container } = render(
      <AssessmentSelectableWrapper elementId="node-1">
        <span>Node</span>
      </AssessmentSelectableWrapper>
    )

    expect(
      container.querySelector('[data-apollon-element-id="node-1"]')
    ).toHaveClass("apollon-highlight", "apollon-highlight--selected")
  })
})
