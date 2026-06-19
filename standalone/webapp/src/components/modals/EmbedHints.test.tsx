import { describe, expect, it } from "vitest"
import { fireEvent, screen } from "@testing-library/react"
import { renderWithRouter } from "@/test/renderWithRouter"
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
  it("prompts to share first when the diagram isn't server-persisted", async () => {
    renderWithRouter(<EmbedHints title="My diagram" />)
    expect(await screen.findByText(/share this diagram first/i)).toBeTruthy()
    expect(screen.queryByLabelText("Embed snippet")).toBeNull()
  })

  it("switches the snippet when a different format is selected", async () => {
    renderWithRouter(<EmbedHints title="My diagram" />, {
      initialEntry: "/shared/abc123",
      routePaths: ["/shared/$diagramId"],
    })
    const input = (await screen.findByLabelText(
      "Embed snippet"
    )) as HTMLInputElement
    // Default is clickable Markdown: `[![alt](preview)](editor)`.
    expect(input.value.startsWith("[![")).toBe(true)

    fireEvent.click(screen.getByText("iframe"))
    expect(input.value.startsWith("<iframe")).toBe(true)
  })
})
