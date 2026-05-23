import { render } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

// The wrapper's whole job is lifecycle plumbing around the imperative
// `ApollonEditor`. Mock the editor so the test stays fast and deterministic
// (a real editor mount drags in xyflow/MUI/emotion and touches layout APIs
// jsdom only half-implements) and assert the contract precisely.
const { ctorSpy, destroySpy } = vi.hoisted(() => ({
  ctorSpy: vi.fn(),
  destroySpy: vi.fn(),
}))

vi.mock("@/apollon-editor", () => ({
  ApollonEditor: class {
    constructor(...args: unknown[]) {
      ctorSpy(...args)
    }
    destroy = destroySpy
  },
}))

import { Apollon } from "@/components/react/Apollon"

describe("<Apollon>", () => {
  beforeEach(() => {
    ctorSpy.mockClear()
    destroySpy.mockClear()
  })

  it("renders the container div with the given className and style", () => {
    const { container } = render(
      <Apollon className="diagram" style={{ height: 540 }} />
    )
    const div = container.firstElementChild as HTMLElement

    expect(div.tagName).toBe("DIV")
    expect(div.className).toBe("diagram")
    expect(div.style.height).toBe("540px")
  })

  it("constructs the editor once, with the container and the options", () => {
    render(<Apollon readonly mode={undefined} />)

    expect(ctorSpy).toHaveBeenCalledTimes(1)
    const [element, options] = ctorSpy.mock.calls[0]
    expect(element).toBeInstanceOf(HTMLElement)
    expect(options).toEqual({ readonly: true, mode: undefined })
  })

  it("does not forward style/className/onReady into the editor options", () => {
    render(
      <Apollon
        className="x"
        style={{ height: 540 }}
        onReady={() => {}}
        readonly
      />
    )
    expect(ctorSpy.mock.calls[0][1]).toEqual({ readonly: true })
  })

  it("hands the editor instance to onReady", () => {
    const onReady = vi.fn()
    render(<Apollon onReady={onReady} />)

    expect(onReady).toHaveBeenCalledTimes(1)
    expect(typeof onReady.mock.calls[0][0].destroy).toBe("function")
  })

  it("destroys the editor on unmount", () => {
    const { unmount } = render(<Apollon />)
    expect(destroySpy).not.toHaveBeenCalled()

    unmount()
    expect(destroySpy).toHaveBeenCalledTimes(1)
  })

  it("does not rebuild the editor when props change", () => {
    const { rerender } = render(<Apollon readonly={false} />)
    rerender(<Apollon readonly />)
    rerender(<Apollon readonly style={{ height: 600 }} />)

    expect(ctorSpy).toHaveBeenCalledTimes(1)
    expect(destroySpy).not.toHaveBeenCalled()
  })
})
