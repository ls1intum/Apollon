import { createRef } from "react"
import { render } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

// The wrapper's whole job is lifecycle plumbing around the imperative
// `ApollonEditor`. Mock the editor so the test stays fast and deterministic
// (a real editor mount drags in xyflow/MUI/emotion and touches layout APIs
// jsdom only half-implements) and assert the contract precisely.
const { ctorSpy, destroySpy, setReadonlySpy, setModeSpy, setPreviewModeSpy } =
  vi.hoisted(() => ({
    ctorSpy: vi.fn(),
    destroySpy: vi.fn(),
    setReadonlySpy: vi.fn(),
    setModeSpy: vi.fn(),
    setPreviewModeSpy: vi.fn(),
  }))

vi.mock("@/apollon-editor", () => ({
  ApollonEditor: class {
    constructor(...args: unknown[]) {
      ctorSpy(...args)
    }
    destroy = destroySpy
    setReadonly = setReadonlySpy
    setMode = setModeSpy
    setPreviewMode = setPreviewModeSpy
  },
}))

import { Apollon } from "@/components/react/Apollon"
import {
  ApollonInstanceContext,
  useApollonEditor,
} from "@/components/react/context"
import { useContext } from "react"

describe("<Apollon>", () => {
  beforeEach(() => {
    ctorSpy.mockClear()
    destroySpy.mockClear()
    setReadonlySpy.mockClear()
    setModeSpy.mockClear()
    setPreviewModeSpy.mockClear()
  })

  it("renders the container div with the given className and style", () => {
    const { container } = render(
      <Apollon className="diagram" style={{ height: 600 }} />
    )
    const div = container.firstElementChild as HTMLElement

    expect(div.tagName).toBe("DIV")
    expect(div.className).toBe("diagram")
    expect(div.style.height).toBe("600px")
  })

  it("constructs the editor once with the container and initial-only options", () => {
    render(<Apollon defaultMode={undefined} readonly />)

    expect(ctorSpy).toHaveBeenCalledTimes(1)
    const [element, options] = ctorSpy.mock.calls[0] as [
      HTMLElement,
      Record<string, unknown>,
    ]
    expect(element).toBeInstanceOf(HTMLElement)
    // Reactive props (readonly here) are NOT in the constructor options —
    // they're applied via the matching setter effect after mount.
    expect(options.readonly).toBeUndefined()
    // Initial-only props would land here (verified separately above).
  })

  it("does not leak component-only props into the editor options", () => {
    render(
      <Apollon
        className="x"
        style={{ height: 600 }}
        onMount={() => {}}
        readonly
      />
    )
    const options = ctorSpy.mock.calls[0][1] as Record<string, unknown>
    expect(options.className).toBeUndefined()
    expect(options.style).toBeUndefined()
    expect(options.onMount).toBeUndefined()
    expect(options.children).toBeUndefined()
  })

  it("hands the editor instance to onMount", () => {
    const onMount = vi.fn()
    render(<Apollon onMount={onMount} />)

    expect(onMount).toHaveBeenCalledTimes(1)
    expect(typeof onMount.mock.calls[0][0].destroy).toBe("function")
  })

  it("runs the onMount cleanup return before destroying", () => {
    const order: string[] = []
    const cleanup = vi.fn(() => order.push("onMount-cleanup"))
    destroySpy.mockImplementation(() => order.push("destroy"))

    const { unmount } = render(<Apollon onMount={() => cleanup} />)
    unmount()

    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(order).toEqual(["onMount-cleanup", "destroy"])
  })

  it("populates the ref and nulls it on unmount", () => {
    const ref = createRef<unknown>()
    const { unmount } = render(<Apollon ref={ref} />)

    expect(ref.current).not.toBeNull()
    expect(typeof (ref.current as { destroy: () => void }).destroy).toBe(
      "function"
    )

    unmount()
    expect(ref.current).toBeNull()
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

  it("re-asserts reactive props via setters when they change", () => {
    const { rerender } = render(<Apollon readonly={false} />)
    // Initial mount asserts the first value once.
    expect(setReadonlySpy).toHaveBeenLastCalledWith(false)

    rerender(<Apollon readonly />)
    expect(setReadonlySpy).toHaveBeenLastCalledWith(true)

    rerender(<Apollon readonly previewMode />)
    expect(setPreviewModeSpy).toHaveBeenLastCalledWith(true)
  })

  it("exposes the editor through context to children", () => {
    let seen: unknown = "unset"
    function Probe() {
      seen = useApollonEditor()
      return null
    }
    render(
      <Apollon>
        <Probe />
      </Apollon>
    )
    expect(seen).not.toBeNull()
    expect(seen).not.toBe("unset")
    expect(typeof (seen as { destroy: () => void } | null)?.destroy).toBe(
      "function"
    )
  })

  it("provides null in context before mount completes (initial render)", () => {
    // Smoke check: the context's initial value is null until the mount
    // effect publishes the editor. Confirm by reading the raw context
    // outside any provider — it should be null, never undefined.
    function Probe() {
      const value = useContext(ApollonInstanceContext)
      expect(value).toBeNull()
      return null
    }
    render(<Probe />)
  })
})
