import { act, render, waitFor } from "@testing-library/react"
import { useEffect } from "react"
import { describe, expect, it } from "vitest"
import { usePortalThemeVars } from "@/components/ui/portalTheme"

/** Renders what a body-portaled popup would paint with. */
function Probe({
  anchor,
  onRender,
}: {
  anchor: Element | null
  onRender?: () => void
}) {
  const vars = usePortalThemeVars(anchor) as Record<string, string>
  // No dependency array: runs after every render.
  useEffect(() => {
    onRender?.()
  })
  return (
    <span data-testid="surface">{vars["--apollon-surface"] ?? "none"}</span>
  )
}

const mountEditor = (surface: string) => {
  const editor = document.createElement("div")
  editor.className = "apollon-editor"
  editor.style.setProperty("--apollon-surface", surface)
  const anchor = document.createElement("button")
  editor.appendChild(anchor)
  document.body.appendChild(editor)
  return { editor, anchor }
}

/** Let the MutationObserver deliver and React flush. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))

describe("usePortalThemeVars", () => {
  it("resolves the editor's tokens for a portaled popup", () => {
    const { anchor } = mountEditor("rgb(1, 2, 3)")
    const { getByTestId } = render(<Probe anchor={anchor} />)
    expect(getByTestId("surface").textContent).toBe("rgb(1, 2, 3)")
  })

  // The popup copies resolved VALUES, so without a subscription it would keep
  // painting the palette it first resolved under — a theme switch would leave an
  // open menu, and every later one on the same anchor, in the old colors.
  it("repaints when a scoped `data-theme` flips", async () => {
    const { editor, anchor } = mountEditor("rgb(1, 2, 3)")
    const { getByTestId } = render(<Probe anchor={anchor} />)

    act(() => {
      editor.setAttribute("data-theme", "dark")
      editor.style.setProperty("--apollon-surface", "rgb(4, 4, 4)")
    })

    await waitFor(() =>
      expect(getByTestId("surface").textContent).toBe("rgb(4, 4, 4)")
    )
  })

  // VS Code re-injects the <style> that declares its `--vscode-*` block on every
  // theme switch, without touching a single attribute.
  it("repaints when the host swaps the stylesheet that declares its tokens", async () => {
    const { editor, anchor } = mountEditor("rgb(1, 2, 3)")
    const { getByTestId } = render(<Probe anchor={anchor} />)

    act(() => {
      editor.style.setProperty("--apollon-surface", "rgb(5, 5, 5)")
      document.head.appendChild(document.createElement("style"))
    })

    await waitFor(() =>
      expect(getByTestId("surface").textContent).toBe("rgb(5, 5, 5)")
    )
  })

  // A palette drag locks page scroll by writing `body.style.overflow`. If the
  // subscription watched `style` on <body>, every grab would re-resolve tokens
  // for every mounted popup — an editor keeps dozens of tooltips alive.
  it("ignores inline style written to <body>", async () => {
    const { anchor } = mountEditor("rgb(1, 2, 3)")
    let renders = 0
    render(<Probe anchor={anchor} onRender={() => (renders += 1)} />)
    await settle()
    const before = renders

    document.body.style.overflow = "hidden"
    await settle()

    expect(renders).toBe(before)
  })
})
