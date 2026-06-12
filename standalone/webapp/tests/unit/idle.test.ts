import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { runWhenIdle, waitForIdle } from "../../src/utils/idle"

describe("runWhenIdle", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Force the setTimeout fallback so fake timers drive scheduling deterministically
    // (jsdom has no requestIdleCallback, but stub it explicitly to be robust).
    vi.stubGlobal("requestIdleCallback", undefined)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("runs the callback once the thread is idle", () => {
    const callback = vi.fn()
    runWhenIdle(callback)
    vi.runAllTimers()
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it("the returned cancel() prevents the callback (effect-cleanup contract)", () => {
    const callback = vi.fn()
    const cancel = runWhenIdle(callback)
    cancel()
    vi.runAllTimers()
    expect(callback).not.toHaveBeenCalled()
  })

  it("waitForIdle resolves once idle", async () => {
    const resolved = waitForIdle()
    vi.runAllTimers()
    await expect(resolved).resolves.toBeUndefined()
  })
})
