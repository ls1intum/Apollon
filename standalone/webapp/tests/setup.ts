// jsdom implements neither IntersectionObserver nor ResizeObserver, and both
// are used by components under test (version thumbnails gate their body fetch
// on visibility; the preview banner measures its canvas column). Stub them as
// no-ops — a thumbnail therefore never becomes "visible" and never fetches,
// which is the correct default for tests that aren't about the gate itself.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

if (typeof globalThis.IntersectionObserver === "undefined") {
  Object.assign(globalThis, { IntersectionObserver: NoopObserver })
}
if (typeof globalThis.ResizeObserver === "undefined") {
  Object.assign(globalThis, { ResizeObserver: NoopObserver })
}

export {}
