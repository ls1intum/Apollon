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
    const field = screen.getByLabelText("Embed code") as HTMLInputElement
    // Default is the clickable framed image (the "Open in Apollon" button is
    // baked into the preview SVG), wrapped in a link to the editor.
    expect(field.value.startsWith("[![")).toBe(true)
    expect(field.value).toContain("/preview.svg")
    expect(field.value).toContain("?view=EDIT")
    // A single-line snippet — one image, one link.
    expect(field.value).not.toContain("\n")

    fireEvent.click(screen.getByText("Markdown (no link)"))
    // Plain image, no link wrapper — and the image drops the CTA button.
    expect(field.value.startsWith("![")).toBe(true)
    expect(field.value.startsWith("[![")).toBe(false)
    expect(field.value).not.toContain("?view=EDIT")
    expect(field.value).toContain("?frame=plain")

    fireEvent.click(screen.getByText("iframe"))
    expect(field.value.startsWith("<iframe")).toBe(true)
  })
})
