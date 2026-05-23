import { createRef, StrictMode } from "react"
import { render } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

// The wrapper's job is lifecycle plumbing around the imperative `ApollonEditor`.
// Mock it so the test stays fast and asserts the contract surface exactly.
const { ctorSpy, destroySpy, setReadonlySpy, setPreviewModeSpy } = vi.hoisted(
  () => ({
    ctorSpy: vi.fn(),
    destroySpy: vi.fn(),
    setReadonlySpy: vi.fn(),
    setPreviewModeSpy: vi.fn(),
  })
)

vi.mock("@/apollon-editor", () => ({
  ApollonEditor: class {
    constructor(...args: unknown[]) {
      ctorSpy(...args)
    }
    destroy = destroySpy
    setReadonly = setReadonlySpy
    setMode = vi.fn()
    setPreviewMode = setPreviewModeSpy
  },
}))

import { Apollon } from "@/components/react/Apollon"
import { useApollonEditor } from "@/components/react/context"

describe("<Apollon>", () => {
  beforeEach(() => {
    ctorSpy.mockClear()
    destroySpy.mockClear()
    setReadonlySpy.mockClear()
    setPreviewModeSpy.mockClear()
  })

  it("constructs once with initial-only options; reactive props bypass the constructor", () => {
    render(<Apollon defaultMode={undefined} readonly />)

    expect(ctorSpy).toHaveBeenCalledTimes(1)
    const [element, options] = ctorSpy.mock.calls[0] as [
      HTMLElement,
      Record<string, unknown>,
    ]
    expect(element).toBeInstanceOf(HTMLElement)
    expect(options.readonly).toBeUndefined()
    expect(options.className).toBeUndefined()
    expect(options.onMount).toBeUndefined()
  })

  it("runs onMount cleanup → destroy in that order", () => {
    const order: string[] = []
    const cleanup = vi.fn(() => order.push("cleanup"))
    destroySpy.mockImplementation(() => order.push("destroy"))

    const { unmount } = render(<Apollon onMount={() => cleanup} />)
    unmount()

    expect(order).toEqual(["cleanup", "destroy"])
  })

  it("populates the ref on mount and nulls it on unmount", () => {
    const ref = createRef<unknown>()
    const { unmount } = render(<Apollon ref={ref} />)

    expect(typeof (ref.current as { destroy: () => void }).destroy).toBe(
      "function"
    )

    unmount()
    expect(ref.current).toBeNull()
  })

  it("re-applies reactive props via setters; never rebuilds", () => {
    const { rerender } = render(<Apollon readonly={false} />)
    expect(setReadonlySpy).toHaveBeenLastCalledWith(false)

    rerender(<Apollon readonly />)
    expect(setReadonlySpy).toHaveBeenLastCalledWith(true)

    rerender(<Apollon readonly previewMode />)
    expect(setPreviewModeSpy).toHaveBeenLastCalledWith(true)

    expect(ctorSpy).toHaveBeenCalledTimes(1)
  })

  it("exposes the editor through context to children", () => {
    let seen: unknown = null
    function Probe() {
      seen = useApollonEditor()
      return null
    }
    render(
      <Apollon>
        <Probe />
      </Apollon>
    )
    expect(typeof (seen as { destroy: () => void } | null)?.destroy).toBe(
      "function"
    )
  })

  it("survives StrictMode double-mount cleanly", () => {
    const { unmount } = render(
      <StrictMode>
        <Apollon />
      </StrictMode>
    )
    // StrictMode mounts, cleans up, re-mounts: 2 ctor calls, 1 destroy.
    expect(ctorSpy).toHaveBeenCalledTimes(2)
    expect(destroySpy).toHaveBeenCalledTimes(1)

    unmount()
    expect(destroySpy).toHaveBeenCalledTimes(2)
  })
})
