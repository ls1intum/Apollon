import { describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { EmbedHints, sanitizeMarkdownAlt } from "./EmbedHints"

describe("sanitizeMarkdownAlt", () => {
  it("strips characters that break Markdown alt text and collapses whitespace", () => {
    expect(sanitizeMarkdownAlt("Order [v1] (draft)")).toBe("Order v1 draft")
    expect(sanitizeMarkdownAlt("a\n  b\tc")).toBe("a b c")
  })

  it("falls back to a default when the title is empty after stripping", () => {
    expect(sanitizeMarkdownAlt("   ")).toBe("Apollon diagram")
    expect(sanitizeMarkdownAlt("[]()")).toBe("Apollon diagram")
  })
})

describe("EmbedHints", () => {
  it("prompts to share first when there is no shared diagram id", () => {
    render(<EmbedHints title="My diagram" />)
    expect(screen.getByText(/share the diagram to embed/i)).toBeTruthy()
    expect(screen.queryByLabelText("Embed code")).toBeNull()
  })

  it("switches the snippet when a different format is selected", () => {
    render(<EmbedHints diagramId="abc123" title="My diagram" />)
    const field = screen.getByLabelText("Embed code") as HTMLTextAreaElement
    // Default is clickable Markdown: the diagram image followed by the hosted
    // "Open in Apollon" badge, both linking to the editor.
    expect(field.value.startsWith("[![")).toBe(true)
    expect(field.value).toContain("/api/embed/button.svg")
    expect(field.value).toContain("[![Open in Apollon]")

    fireEvent.click(screen.getByText("Markdown (no link)"))
    // Plain image only — no link wrapper, no badge.
    expect(field.value.startsWith("![")).toBe(true)
    expect(field.value).not.toContain("button.svg")

    fireEvent.click(screen.getByText("iframe"))
    expect(field.value.startsWith("<iframe")).toBe(true)
  })
})
