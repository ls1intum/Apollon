import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { CollapsibleSidebar } from "./CollapsibleSidebar"

const renderSidebar = (open: boolean, onToggle = () => {}) =>
  render(
    <CollapsibleSidebar
      side="left"
      width={300}
      open={open}
      onToggle={onToggle}
      label="controls"
      testId="sidebar"
    >
      <span>Panel body</span>
    </CollapsibleSidebar>
  )

describe("CollapsibleSidebar", () => {
  it("renders its content when open", () => {
    renderSidebar(true)
    expect(screen.getByText("Panel body")).toBeTruthy()
  })

  it("hides content when collapsed and toggles via the expand control", () => {
    const onToggle = vi.fn()
    renderSidebar(false, onToggle)

    expect(screen.queryByText("Panel body")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Expand controls" }))
    expect(onToggle).toHaveBeenCalledOnce()
  })
})
