import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { RadioGroup, RadioGroupItem } from "@/components/radio-group"
import { Label } from "@/components/label"

function Example({ onValueChange }: { onValueChange?: (v: string) => void }) {
  return (
    <RadioGroup defaultValue="a" onValueChange={onValueChange}>
      <Label>
        <RadioGroupItem value="a" /> A
      </Label>
      <Label>
        <RadioGroupItem value="b" /> B
      </Label>
    </RadioGroup>
  )
}

describe("RadioGroup", () => {
  it("exposes radiogroup + radio roles", () => {
    render(<Example />)
    expect(screen.getByRole("radiogroup")).toBeInTheDocument()
    expect(screen.getAllByRole("radio")).toHaveLength(2)
  })

  it("changes selection with arrow keys", async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<Example onValueChange={onValueChange} />)

    const [first] = screen.getAllByRole("radio")
    first.focus()
    await user.keyboard("{ArrowDown}")
    // Base UI invokes the change handler with the value plus an event-details
    // object, so assert on the value argument rather than an exact arg list.
    await waitFor(() =>
      expect(onValueChange).toHaveBeenCalledWith("b", expect.anything())
    )
  })
})
