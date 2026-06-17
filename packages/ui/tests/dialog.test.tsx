import { describe, it, expect } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/dialog"

function Example() {
  return (
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent>
        <DialogTitle>Title</DialogTitle>
        <DialogDescription>Body</DialogDescription>
        <button>Inner</button>
      </DialogContent>
    </Dialog>
  )
}

describe("Dialog", () => {
  it("opens on trigger click and exposes the dialog role + title", async () => {
    const user = userEvent.setup()
    render(<Example />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Open" }))
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText("Title")).toBeInTheDocument()
  })

  it("traps focus inside the dialog", async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole("button", { name: "Open" }))
    await screen.findByRole("dialog")

    // Tabbing cycles among the close button and inner button — focus never
    // escapes back to the (now inert) trigger. Base UI's focus-guard sentinels
    // redirect focus back into the popup on the next tick, so wait for the
    // trap to reassert rather than asserting synchronously after Tab.
    await user.tab()
    await user.tab()
    await user.tab()
    await waitFor(() =>
      expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(
        true
      )
    )
  })

  it("closes on Escape and restores focus to the trigger", async () => {
    const user = userEvent.setup()
    render(<Example />)
    const trigger = screen.getByRole("button", { name: "Open" })
    await user.click(trigger)
    await screen.findByRole("dialog")

    await user.keyboard("{Escape}")
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    await waitFor(() => expect(trigger).toHaveFocus())
  })
})
