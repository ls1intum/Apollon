import { describe, it, expect } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { Popover, PopoverTrigger, PopoverContent } from "@/components/popover"

function Example() {
  return (
    <Popover>
      <PopoverTrigger>Open</PopoverTrigger>
      <PopoverContent>
        <button>Inner</button>
      </PopoverContent>
    </Popover>
  )
}

describe("Popover", () => {
  it("opens on trigger and closes on Escape with focus restored", async () => {
    const user = userEvent.setup()
    render(<Example />)
    const trigger = screen.getByRole("button", { name: "Open" })

    await user.click(trigger)
    expect(await screen.findByText("Inner")).toBeVisible()

    await user.keyboard("{Escape}")
    await waitFor(() =>
      expect(screen.queryByText("Inner")).not.toBeInTheDocument()
    )
    await waitFor(() => expect(trigger).toHaveFocus())
  })
})
