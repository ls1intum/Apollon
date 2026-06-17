import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { Checkbox } from "@/components/checkbox"

describe("Checkbox", () => {
  it("exposes the checkbox role and toggles on keyboard space", async () => {
    const onCheckedChange = vi.fn()
    const user = userEvent.setup()
    render(<Checkbox onCheckedChange={onCheckedChange} aria-label="Agree" />)

    const box = screen.getByRole("checkbox", { name: "Agree" })
    expect(box).toHaveAttribute("aria-checked", "false")

    box.focus()
    await user.keyboard("[Space]")
    // Base UI invokes the change handler with the value plus an event-details
    // object, so assert on the value argument rather than an exact arg list.
    await waitFor(() =>
      expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything())
    )
  })

  it("toggles on click", async () => {
    const user = userEvent.setup()
    render(<Checkbox aria-label="Agree" />)
    const box = screen.getByRole("checkbox", { name: "Agree" })
    await user.click(box)
    await waitFor(() => expect(box).toHaveAttribute("aria-checked", "true"))
  })

  it("respects the disabled state", () => {
    // Base UI renders a <span role="checkbox">, so disabled surfaces as
    // aria-disabled rather than the native `disabled` attribute.
    render(<Checkbox aria-label="Agree" disabled />)
    const box = screen.getByRole("checkbox", { name: "Agree" })
    expect(box).toHaveAttribute("aria-disabled", "true")
  })
})
