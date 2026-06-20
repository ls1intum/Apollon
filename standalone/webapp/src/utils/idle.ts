type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback) => number
  cancelIdleCallback?: (id: number) => void
}

// Fallback delay where requestIdleCallback is unavailable (Safari < 17, jsdom).
const IDLE_FALLBACK_MS = 120

/**
 * Run `callback` once the main thread is idle; returns a cancel function safe to
 * use as an effect cleanup. Falls back to a short timeout where
 * requestIdleCallback is unavailable.
 */
export const runWhenIdle = (callback: () => void): (() => void) => {
  const idleWindow = window as IdleWindow
  if (typeof idleWindow.requestIdleCallback === "function") {
    const id = idleWindow.requestIdleCallback(() => callback())
    return () => idleWindow.cancelIdleCallback?.(id)
  }
  const id = window.setTimeout(callback, IDLE_FALLBACK_MS)
  return () => window.clearTimeout(id)
}

/** Promise form of {@link runWhenIdle} for yielding between serial queue items. */
export const waitForIdle = (): Promise<void> =>
  new Promise((resolve) => {
    runWhenIdle(resolve)
  })
