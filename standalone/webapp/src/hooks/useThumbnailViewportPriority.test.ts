import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { renderHook } from "@testing-library/react"
import { useThumbnailViewportPriority } from "./useThumbnailViewportPriority"
import { dequeueNextDiagram } from "./dequeueNextDiagram"

/**
 * Minimal controllable IntersectionObserver stand-in. jsdom ships none, so we
 * inject one we can drive: `emit` pushes synthetic entries to the observer's
 * callback exactly as the browser would on scroll.
 */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = []
  readonly observed = new Set<Element>()
  constructor(private readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.instances.push(this)
  }
  observe(node: Element) {
    this.observed.add(node)
  }
  unobserve(node: Element) {
    this.observed.delete(node)
  }
  disconnect() {
    this.observed.clear()
  }
  emit(
    entries: Array<{ target: Element; isIntersecting: boolean; top: number }>
  ) {
    this.callback(
      entries.map(
        (entry) =>
          ({
            target: entry.target,
            isIntersecting: entry.isIntersecting,
            boundingClientRect: { top: entry.top } as DOMRectReadOnly,
          }) as IntersectionObserverEntry
      ),
      this as unknown as IntersectionObserver
    )
  }
}

const nodeFor = (id: string) => {
  const node = document.createElement("div")
  node.dataset.id = id
  return node
}

describe("useThumbnailViewportPriority", () => {
  beforeEach(() => {
    FakeIntersectionObserver.instances = []
    ;(globalThis as unknown as Record<string, unknown>).IntersectionObserver =
      FakeIntersectionObserver
  })

  afterEach(() => {
    delete (globalThis as unknown as Record<string, unknown>)
      .IntersectionObserver
  })

  it("prioritizes the on-screen card over the front of the queue", () => {
    const { result } = renderHook(() => useThumbnailViewportPriority())

    // Six cards mount (the whole infinite-scroll window), all observed.
    const ids = ["a", "b", "c", "d", "e", "f"]
    const nodes = new Map(ids.map((id) => [id, nodeFor(id)]))
    for (const id of ids) {
      result.current.observe(id, nodes.get(id)!)
    }

    const observer = FakeIntersectionObserver.instances[0]
    expect(observer.observed.size).toBe(6)

    // The user has scrolled so cards "d" and "e" are on screen; "a"/"b" (top of
    // the queue) have scrolled out of view.
    observer.emit([
      { target: nodes.get("a")!, isIntersecting: false, top: -600 },
      { target: nodes.get("b")!, isIntersecting: false, top: -300 },
      { target: nodes.get("d")!, isIntersecting: true, top: 220 },
      { target: nodes.get("e")!, isIntersecting: true, top: 40 },
    ])

    // The worker would still hold the whole window queued in list order; the
    // selection must skip the off-screen top and take the TOPMOST visible card
    // ("e", smaller `top`) — not "a".
    const queue = ids.map((id) => ({ id }))
    expect(dequeueNextDiagram(queue, result.current)?.id).toBe("e")
    // Next pick: "e" is gone, "d" is the only remaining on-screen card.
    expect(dequeueNextDiagram(queue, result.current)?.id).toBe("d")
    // Nothing else on screen -> background tail drains from the front.
    expect(dequeueNextDiagram(queue, result.current)?.id).toBe("a")
  })

  it("drops an id from the visible set when its card scrolls away", () => {
    const { result } = renderHook(() => useThumbnailViewportPriority())
    const node = nodeFor("a")
    result.current.observe("a", node)
    const observer = FakeIntersectionObserver.instances[0]

    observer.emit([{ target: node, isIntersecting: true, top: 10 }])
    expect(result.current.pickNext(["a"])).toBe("a")

    observer.emit([{ target: node, isIntersecting: false, top: -400 }])
    expect(result.current.pickNext(["a"])).toBeNull()
  })

  it("unobserves and clears the id when a card's cleanup runs", () => {
    const { result } = renderHook(() => useThumbnailViewportPriority())
    const node = nodeFor("a")
    const cleanup = result.current.observe("a", node)
    const observer = FakeIntersectionObserver.instances[0]

    observer.emit([{ target: node, isIntersecting: true, top: 10 }])
    expect(result.current.pickNext(["a"])).toBe("a")

    cleanup()
    expect(observer.observed.has(node)).toBe(false)
    expect(result.current.pickNext(["a"])).toBeNull()
  })

  it("disconnects the observer on unmount", () => {
    const { result, unmount } = renderHook(() => useThumbnailViewportPriority())
    result.current.observe("a", nodeFor("a"))
    const observer = FakeIntersectionObserver.instances[0]
    expect(observer.observed.size).toBe(1)

    unmount()
    expect(observer.observed.size).toBe(0)
  })
})
