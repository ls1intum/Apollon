import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { CollaborationViewportSidebar } from "./CollaborationViewportSidebar"

describe("CollaborationViewportSidebar", () => {
  it("renders the expanded test panel", () => {
    render(<CollaborationViewportSidebar open onToggle={() => {}} />)

    expect(
      screen.getByTestId("collaboration-viewport-sidebar").style.width
    ).toBe("320px")
    expect(screen.getByText("Problem statement")).toBeTruthy()
  })

  it("keeps an expand control visible when collapsed", () => {
    const onToggle = vi.fn()
    render(<CollaborationViewportSidebar open={false} onToggle={onToggle} />)

    expect(
      screen.getByTestId("collaboration-viewport-sidebar").style.width
    ).toBe("44px")
    expect(screen.queryByText("Problem statement")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Expand test sidebar" }))
    expect(onToggle).toHaveBeenCalledOnce()
  })
})
