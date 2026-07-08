import { createRef } from "react"
import { render, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

// Lifecycle plumbing around the imperative `ApollonEditor`. We mock the
// editor because mounting the real one drags in xyflow/MUI/emotion + layout
// APIs jsdom only half-implements. The mock fails open for deep behavior
// (`destroy()` is a no-op spy), so what we assert here is strictly the
// wrapper's responsibility: which arguments reach the constructor, which
// reactive setters fire on prop changes, and ref forwarding.
const {
  ctorSpy,
  destroySpy,
  setReadonlySpy,
  setPreviewModeSpy,
  addControlSpy,
} = vi.hoisted(() => ({
  ctorSpy: vi.fn(),
  destroySpy: vi.fn(),
  setReadonlySpy: vi.fn(),
  setPreviewModeSpy: vi.fn(),
  addControlSpy: vi.fn(() => () => {}),
}))

vi.mock("@/apollon-editor", () => ({
  ApollonEditor: class {
    constructor(...args: unknown[]) {
      ctorSpy(...args)
    }
    destroy = destroySpy
    setReadonly = setReadonlySpy
    setMode = vi.fn()
    setScrollLock = vi.fn()
    setPreviewMode = setPreviewModeSpy
    // The wrapper renders default `<Apollon.*>` chrome as fallback children, which
    // register through `addControl`; return a no-op disposer.
    addControl = addControlSpy
  },
}))

import { Apollon } from "@/components/react/Apollon"

describe("<Apollon>", () => {
  beforeEach(() => {
    ctorSpy.mockClear()
    destroySpy.mockClear()
    setReadonlySpy.mockClear()
    setPreviewModeSpy.mockClear()
    addControlSpy.mockClear()
  })

  it("constructs once with initial-only options; reactive props bypass the constructor", () => {
    render(<Apollon defaultMode={undefined} readonly previewMode />)

    expect(ctorSpy).toHaveBeenCalledTimes(1)
    const [element, options] = ctorSpy.mock.calls[0] as [
      HTMLElement,
      Record<string, unknown>,
    ]
    expect(element).toBeInstanceOf(HTMLElement)
    expect(options.readonly).toBeUndefined()
    expect(options.previewMode).toBeUndefined()
    expect(options.className).toBeUndefined()
    expect(options.onMount).toBeUndefined()
  })

  it("forwards the ref and nulls it on unmount", () => {
    const ref = createRef<unknown>()
    const { unmount } = render(<Apollon ref={ref} />)

    expect(typeof (ref.current as { destroy: () => void }).destroy).toBe(
      "function"
    )

    unmount()
    expect(ref.current).toBeNull()
  })

  it("renders default chrome only when children are omitted", async () => {
    const { unmount } = render(<Apollon />)

    await waitFor(() => expect(addControlSpy).toHaveBeenCalledTimes(3))
    unmount()
    addControlSpy.mockClear()

    render(<Apollon>{null}</Apollon>)
    await waitFor(() => expect(ctorSpy).toHaveBeenCalledTimes(2))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(addControlSpy).not.toHaveBeenCalled()
  })

  it("re-applies reactive props via setters on change; never rebuilds", () => {
    const { rerender } = render(<Apollon readonly={false} />)
    expect(setReadonlySpy).toHaveBeenLastCalledWith(false)

    rerender(<Apollon readonly />)
    expect(setReadonlySpy).toHaveBeenLastCalledWith(true)

    rerender(<Apollon readonly previewMode />)
    expect(setPreviewModeSpy).toHaveBeenLastCalledWith(true)

    expect(ctorSpy).toHaveBeenCalledTimes(1)
  })
})
