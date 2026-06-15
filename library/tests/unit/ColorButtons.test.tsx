import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ColorButton } from "@/components/ui/StyleEditor/ColorButtons"

describe("ColorButton", () => {
  it("uses a dark checkmark on light swatches", () => {
    render(<ColorButton color="#d1d8e0" onSelect={vi.fn()} selected />)

    expect(screen.getByRole("button", { name: "#d1d8e0" })).toHaveStyle({
      color: "rgb(0, 0, 0)",
    })
  })

  it("uses a light checkmark on dark swatches", () => {
    render(<ColorButton color="#000000" onSelect={vi.fn()} selected />)

    expect(screen.getByRole("button", { name: "#000000" })).toHaveStyle({
      color: "rgb(255, 255, 255)",
    })
  })
})
