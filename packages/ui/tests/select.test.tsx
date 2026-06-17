import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/select"

function Example({ onValueChange }: { onValueChange?: (v: string) => void }) {
  return (
    <Select onValueChange={onValueChange}>
      <SelectTrigger aria-label="Fruit">
        <SelectValue placeholder="Pick one" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
      </SelectContent>
    </Select>
  )
}

describe("Select", () => {
  it("exposes a combobox trigger and opens a listbox of options", async () => {
    const user = userEvent.setup()
    render(<Example />)
    const trigger = screen.getByRole("combobox", { name: "Fruit" })
    expect(trigger).toBeInTheDocument()

    await user.click(trigger)
    expect(await screen.findByRole("listbox")).toBeInTheDocument()
    expect(screen.getAllByRole("option")).toHaveLength(2)
  })

  it("selects an option via keyboard", async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<Example onValueChange={onValueChange} />)

    const trigger = screen.getByRole("combobox", { name: "Fruit" })
    trigger.focus()
    await user.keyboard("{Enter}")
    await screen.findByRole("listbox")

    await user.keyboard("{ArrowDown}{Enter}")
    await waitFor(() => expect(onValueChange).toHaveBeenCalled())
  })
})
