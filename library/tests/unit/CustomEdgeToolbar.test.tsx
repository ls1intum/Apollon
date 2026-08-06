import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { CustomEdgeToolbar } from "@/components/toolbars/edgeToolBar/CustomEdgeToolBar"

vi.mock("@/hooks/useDiagramModifiable", () => ({
  useDiagramModifiable: () => false,
}))

vi.mock("@/hooks/useIsOnlyThisElementSelected", () => ({
  useIsOnlyThisElementSelected: () => false,
}))

vi.mock("@/i18n/useLabels", () => ({
  useLabels: () => ({}),
}))

vi.mock("@xyflow/react", () => ({
  EdgeToolbar: ({
    isVisible,
    children,
  }: {
    isVisible?: boolean
    children: ReactNode
  }) => (isVisible ? <div>{children}</div> : null),
}))

describe("CustomEdgeToolbar", () => {
  it("keeps the popover anchor mounted when editing actions are hidden", () => {
    let anchor: HTMLDivElement | null = null

    render(
      <CustomEdgeToolbar
        edgeId="edge"
        position={{ x: 10, y: 20 }}
        anchorRef={(element) => {
          anchor = element
        }}
        onEditClick={vi.fn()}
        onDeleteClick={vi.fn()}
      />
    )

    expect(anchor).toBeInstanceOf(HTMLDivElement)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
