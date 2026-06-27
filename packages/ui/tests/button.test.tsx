import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { Button } from "@/components/button"

describe("Button", () => {
  it("renders children inside a button with type=button by default", () => {
    render(<Button>Save</Button>)
    const btn = screen.getByRole("button", { name: "Save" })
    expect(btn).toHaveAttribute("type", "button")
    expect(btn).toHaveAttribute("data-slot", "button")
  })

  it("reflects variant + size via data attributes (styled by components.css)", () => {
    render(
      <Button variant="destructive" size="lg">
        Delete
      </Button>
    )
    const btn = screen.getByRole("button", { name: "Delete" })
    expect(btn).toHaveAttribute("data-variant", "destructive")
    expect(btn).toHaveAttribute("data-size", "lg")
  })

  it("defaults to the default variant + size", () => {
    render(<Button>Go</Button>)
    const btn = screen.getByRole("button", { name: "Go" })
    expect(btn).toHaveAttribute("data-variant", "default")
    expect(btn).toHaveAttribute("data-size", "default")
  })

  it("forwards a custom className", () => {
    render(<Button className="w-full custom">Wide</Button>)
    const btn = screen.getByRole("button", { name: "Wide" })
    expect(btn.className).toContain("w-full")
    expect(btn.className).toContain("custom")
  })

  it("renders a leading icon passed as a child", () => {
    render(
      <Button>
        <span data-testid="ico" /> With icon
      </Button>
    )
    expect(screen.getByTestId("ico")).toBeInTheDocument()
  })

  it("fires onClick and respects disabled", async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(<Button onClick={onClick}>Click</Button>)
    await user.click(screen.getByRole("button", { name: "Click" }))
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(
      <Button onClick={onClick} disabled>
        Click
      </Button>
    )
    await user.click(screen.getByRole("button", { name: "Click" }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
