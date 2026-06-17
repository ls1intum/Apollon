import { describe, it, expect } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/tooltip"

function Example() {
  return (
    <TooltipProvider delay={0}>
      <Tooltip>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Help text</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

describe("Tooltip", () => {
  it("shows on hover", async () => {
    const user = userEvent.setup()
    render(<Example />)
    expect(screen.queryByText("Help text")).not.toBeInTheDocument()

    await user.hover(screen.getByRole("button", { name: "Hover me" }))
    await waitFor(() => expect(screen.getByText("Help text")).toBeVisible())
  })

  it("shows on keyboard focus", async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.tab()
    expect(screen.getByRole("button", { name: "Hover me" })).toHaveFocus()
    await waitFor(() => expect(screen.getByText("Help text")).toBeVisible())
  })
})
