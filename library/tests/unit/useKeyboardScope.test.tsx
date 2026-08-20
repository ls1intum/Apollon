import { act, fireEvent, render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useKeyboardScope } from "@/hooks/useKeyboardScope"

function KeyboardScope({ enabled = true }: { enabled?: boolean }) {
  const { rootRef, active, rootHandlers } = useKeyboardScope(enabled)
  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      data-testid="editor"
      data-active={active}
      {...rootHandlers}
    >
      <div data-testid="pane" />
      <button type="button">Control</button>
      <input aria-label="Name" />
    </div>
  )
}

describe("useKeyboardScope", () => {
  it("activates pointer modifiers on hover without taking page focus", () => {
    const view = render(<KeyboardScope />)
    const editor = view.getByTestId("editor")

    fireEvent.pointerEnter(editor)
    expect(document.activeElement).not.toBe(editor)
    expect(editor.dataset.active).toBe("true")

    fireEvent.pointerLeave(editor)
    expect(editor.dataset.active).toBe("false")
  })

  it("activates an empty pane on pointer down and releases it on leave", () => {
    const view = render(<KeyboardScope />)
    const editor = view.getByTestId("editor")

    fireEvent.pointerDown(view.getByTestId("pane"), { button: 0 })
    expect(document.activeElement).toBe(editor)
    expect(editor.dataset.active).toBe("true")

    fireEvent.pointerLeave(editor)
    expect(document.activeElement).not.toBe(editor)
    expect(editor.dataset.active).toBe("false")
  })

  it("preserves focus that entered through keyboard navigation", () => {
    const view = render(<KeyboardScope />)
    const editor = view.getByTestId("editor")
    const control = view.getByRole("button")

    act(() => control.focus())
    fireEvent.pointerLeave(editor)

    expect(document.activeElement).toBe(control)
    expect(editor.dataset.active).toBe("true")
  })

  it("does not blur an editable field when its pointer leaves", () => {
    const view = render(<KeyboardScope />)
    const editor = view.getByTestId("editor")
    const input = view.getByRole("textbox")

    fireEvent.pointerDown(input, { button: 0 })
    input.focus()
    fireEvent.pointerLeave(editor)

    expect(document.activeElement).toBe(input)
    expect(editor.dataset.active).toBe("false")
  })

  it("stays inactive when shortcuts are disabled", () => {
    const view = render(<KeyboardScope enabled={false} />)
    const editor = view.getByTestId("editor")

    fireEvent.pointerDown(view.getByTestId("pane"), { button: 0 })
    expect(document.activeElement).not.toBe(editor)
    expect(editor.dataset.active).toBe("false")
  })
})
