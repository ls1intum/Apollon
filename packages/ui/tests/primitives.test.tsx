import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"

import { Input } from "@/components/input"
import { Textarea } from "@/components/textarea"
import { Label } from "@/components/label"
import { Separator } from "@/components/separator"
import { Skeleton } from "@/components/skeleton"
import { Spinner } from "@/components/spinner"
import { Alert, AlertTitle, AlertDescription } from "@/components/alert"

describe("Input", () => {
  it("renders a textbox with data-slot and forwards props", () => {
    render(<Input placeholder="Name" defaultValue="x" />)
    const input = screen.getByPlaceholderText("Name")
    expect(input).toHaveAttribute("data-slot", "input")
    expect(input).toHaveValue("x")
  })
})

describe("Textarea", () => {
  it("renders a multiline textbox", () => {
    render(<Textarea aria-label="Notes" />)
    const ta = screen.getByRole("textbox", { name: "Notes" })
    expect(ta.tagName).toBe("TEXTAREA")
    expect(ta).toHaveAttribute("data-slot", "textarea")
  })
})

describe("Label", () => {
  it("associates with a control via htmlFor", () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" />
      </>
    )
    expect(screen.getByText("Email")).toHaveAttribute("for", "email")
  })
})

describe("Separator", () => {
  it("renders a horizontal separator by default", () => {
    render(<Separator />)
    const sep = screen.getByRole("separator")
    expect(sep).toHaveAttribute("data-slot", "separator")
    expect(sep.className).toContain("h-px")
  })

  it("renders vertical when requested", () => {
    render(<Separator orientation="vertical" />)
    expect(screen.getByRole("separator").className).toContain("w-px")
  })
})

describe("Skeleton", () => {
  it("renders an animated placeholder", () => {
    const { container } = render(<Skeleton className="h-4 w-4" />)
    const el = container.querySelector('[data-slot="skeleton"]')!
    expect(el.className).toContain("animate-pulse")
    expect(el.className).toContain("h-4")
  })
})

describe("Spinner", () => {
  it("exposes a status role with an accessible label", () => {
    render(<Spinner />)
    const spinner = screen.getByRole("status", { name: "Loading" })
    expect(spinner.classList.contains("animate-spin")).toBe(true)
  })
})

describe("Alert", () => {
  it("renders with role=alert and the destructive variant", () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Something failed</AlertDescription>
      </Alert>
    )
    const alert = screen.getByRole("alert")
    expect(alert.className).toContain("text-destructive")
    expect(screen.getByText("Error")).toBeInTheDocument()
    expect(screen.getByText("Something failed")).toBeInTheDocument()
  })
})
