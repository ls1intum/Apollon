import { describe, it, expect } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/sheet"

function Example({ side }: { side?: "top" | "right" | "bottom" | "left" }) {
  return (
    <Sheet>
      <SheetTrigger>Open</SheetTrigger>
      <SheetContent side={side}>
        <SheetTitle>Menu</SheetTitle>
        <button>Inner</button>
      </SheetContent>
    </Sheet>
  )
}

describe("Sheet", () => {
  it("opens on trigger and renders with the requested side", async () => {
    const user = userEvent.setup()
    render(<Example side="left" />)
    await user.click(screen.getByRole("button", { name: "Open" }))
    const dialog = await screen.findByRole("dialog")
    const content = dialog.matches('[data-slot="sheet-content"]')
      ? dialog
      : dialog.querySelector('[data-slot="sheet-content"]')!
    expect(content).toHaveAttribute("data-side", "left")
  })

  it("traps focus and closes on Escape, restoring focus", async () => {
    const user = userEvent.setup()
    render(<Example />)
    const trigger = screen.getByRole("button", { name: "Open" })
    await user.click(trigger)
    await screen.findByRole("dialog")

    await user.tab()
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(
      true
    )

    await user.keyboard("{Escape}")
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    await waitFor(() => expect(trigger).toHaveFocus())
  })
})
