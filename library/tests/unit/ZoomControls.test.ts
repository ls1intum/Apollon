import { describe, expect, it, vi } from "vitest"
import { runTidyLayoutAndFit } from "@/chrome/builtins/ZoomControls"

describe("tidy-layout toolbar action", () => {
  it("fits only after the controlled layout has crossed two paint boundaries", () => {
    const callbacks: FrameRequestCallback[] = []
    const schedule = vi.fn((callback: FrameRequestCallback) => {
      callbacks.push(callback)
      return callbacks.length
    })
    const layout = vi.fn()
    const fit = vi.fn()

    runTidyLayoutAndFit(layout, fit, schedule)
    expect(layout).toHaveBeenCalledOnce()
    expect(fit).not.toHaveBeenCalled()
    expect(callbacks).toHaveLength(1)

    callbacks.shift()!(0)
    expect(fit).not.toHaveBeenCalled()
    expect(callbacks).toHaveLength(1)

    callbacks.shift()!(16)
    expect(fit).toHaveBeenCalledOnce()
  })
})
