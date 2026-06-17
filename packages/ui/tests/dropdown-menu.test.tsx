import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/dropdown-menu"

function Example({ onSelect }: { onSelect?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Open</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={onSelect}>First</DropdownMenuItem>
        <DropdownMenuItem>Second</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

describe("DropdownMenu", () => {
  it("opens on trigger and exposes the menu role with menuitems", async () => {
    const user = userEvent.setup()
    render(<Example />)
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Open" }))
    expect(await screen.findByRole("menu")).toBeInTheDocument()
    expect(screen.getAllByRole("menuitem")).toHaveLength(2)
  })

  it("supports keyboard navigation and selection", async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<Example onSelect={onSelect} />)

    const trigger = screen.getByRole("button", { name: "Open" })
    trigger.focus()
    await user.keyboard("{Enter}")
    await screen.findByRole("menu")

    // Opening via the keyboard highlights the first item; ArrowDown moves the
    // highlight to the second, and ArrowDown again wraps back to the first.
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "First" })).toHaveAttribute(
        "data-highlighted"
      )
    )
    await user.keyboard("{ArrowDown}")
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "Second" })).toHaveAttribute(
        "data-highlighted"
      )
    )
    await user.keyboard("{ArrowDown}")
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "First" })).toHaveAttribute(
        "data-highlighted"
      )
    )
    // Activating the highlighted item closes the menu (the observable
    // selection effect).
    await user.keyboard("{Enter}")
    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    )
  })

  it("fires the item handler when clicked", async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<Example onSelect={onSelect} />)

    await user.click(screen.getByRole("button", { name: "Open" }))
    await screen.findByRole("menu")
    await user.click(screen.getByRole("menuitem", { name: "First" }))
    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1))
  })

  it("closes on Escape and restores focus to the trigger", async () => {
    const user = userEvent.setup()
    render(<Example />)
    const trigger = screen.getByRole("button", { name: "Open" })
    await user.click(trigger)
    await screen.findByRole("menu")

    await user.keyboard("{Escape}")
    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    )
    await waitFor(() => expect(trigger).toHaveFocus())
  })
})
