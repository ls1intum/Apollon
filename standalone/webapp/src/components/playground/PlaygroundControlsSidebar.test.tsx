import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PlaygroundControlsSidebar } from "./PlaygroundControlsSidebar"

describe("PlaygroundControlsSidebar", () => {
  it("renders the playground controls at their full width", () => {
    render(
      <PlaygroundControlsSidebar open onToggle={() => {}}>
        <span>Editor controls</span>
      </PlaygroundControlsSidebar>
    )

    expect(screen.getByTestId("playground-controls-sidebar").style.width).toBe(
      "300px"
    )
    expect(screen.getByText("Editor controls")).toBeTruthy()
  })

  it("collapses to a rail with an expand control", () => {
    const onToggle = vi.fn()
    render(
      <PlaygroundControlsSidebar open={false} onToggle={onToggle}>
        <span>Editor controls</span>
      </PlaygroundControlsSidebar>
    )

    expect(screen.getByTestId("playground-controls-sidebar").style.width).toBe(
      "44px"
    )
    expect(screen.queryByText("Editor controls")).toBeNull()

    fireEvent.click(
      screen.getByRole("button", { name: "Expand playground controls" })
    )
    expect(onToggle).toHaveBeenCalledOnce()
  })
})
