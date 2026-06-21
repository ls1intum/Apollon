import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Render the structured row section in isolation: stub the assessment/feedback
// wrappers (which need the diagram stores) to pass-through so we can assert the
// table cells a crow's-foot entity must draw — key gutter, name, type, PK underline.
vi.mock("@/components/AssessmentSelectableElement", () => ({
  AssessmentSelectableElement: ({
    children,
  }: {
    children: React.ReactNode
  }) => <>{children}</>,
}))
vi.mock("@/components/wrapper/FeedbackDropzone", () => ({
  FeedbackDropzone: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

import { ErCfRowSection } from "@/components/svgs/nodes/erDiagram/ErCfRowSection"
import { ErCfColumn } from "@/types"

const columns: ErCfColumn[] = [
  { id: "1", name: "id", type: "int", keys: ["PK"] },
  { id: "2", name: "customerId", type: "int", keys: ["FK"] },
  { id: "3", name: "note" },
]

const renderRows = () =>
  render(
    <svg>
      <ErCfRowSection
        columns={columns}
        padding={10}
        itemHeight={30}
        width={200}
        offsetFromTop={0}
        maxNameWidth={80}
      />
    </svg>
  )

describe("ErCfRowSection (structured crow's-foot table)", () => {
  it("renders name and a separate data-type cell per column", () => {
    const { getByText, getAllByText } = renderRows()
    expect(getByText("id")).toBeTruthy()
    expect(getByText("customerId")).toBeTruthy()
    expect(getByText("note")).toBeTruthy()
    // "int" appears as the type cell for two columns.
    expect(getAllByText("int")).toHaveLength(2)
  })

  it("shows key roles in the gutter (PK, FK)", () => {
    const { getByText } = renderRows()
    expect(getByText("PK")).toBeTruthy()
    expect(getByText("FK")).toBeTruthy()
  })

  it("draws a divider between rows (first row has none)", () => {
    const { container } = renderRows()
    // 3 columns → a rule above rows 2 and 3, none above the first.
    expect(container.querySelectorAll("line")).toHaveLength(2)
  })

  it("omits the type cell when a column has no type", () => {
    const { queryAllByText } = renderRows()
    // "note" has no type; only the two typed columns render a type cell.
    expect(queryAllByText("varchar")).toHaveLength(0)
  })
})
