import { describe, expect, it, vi } from "vitest"
import { dequeueNextDiagram } from "./dequeueNextDiagram"

type QueueItem = { id: string }

const queueOf = (...ids: string[]): QueueItem[] => ids.map((id) => ({ id }))

describe("dequeueNextDiagram", () => {
  it("takes the front of the queue when no viewport priority is provided", () => {
    const queue = queueOf("a", "b", "c")

    expect(dequeueNextDiagram(queue)?.id).toBe("a")
    expect(queue.map((item) => item.id)).toEqual(["b", "c"])
  })

  it("falls back to the front when nothing on screen is pending", () => {
    const queue = queueOf("a", "b", "c")
    const viewportPriority = { pickNext: () => null }

    expect(dequeueNextDiagram(queue, viewportPriority)?.id).toBe("a")
    expect(queue.map((item) => item.id)).toEqual(["b", "c"])
  })

  it("pulls the on-screen card even when it is deep in the queue", () => {
    // Models the bug: the worker has queued the whole infinite-scroll window in
    // list order, but the user has scrolled so a far-down card is on screen.
    const queue = queueOf("a", "b", "c", "d", "e", "f")
    const viewportPriority = { pickNext: () => "e" }

    const next = dequeueNextDiagram(queue, viewportPriority)

    expect(next?.id).toBe("e")
    // The selected card is removed; queue order is otherwise preserved.
    expect(queue.map((item) => item.id)).toEqual(["a", "b", "c", "d", "f"])
  })

  it("re-evaluates priority on every call as the viewport scrolls", () => {
    const queue = queueOf("a", "b", "c", "d")
    // The visible card changes between picks (scroll between renders); the
    // selection follows it instead of draining sequentially from the top.
    const pickNext = vi
      .fn<(ids: Iterable<string>) => string | null>()
      .mockReturnValueOnce("c")
      .mockReturnValueOnce("d")
      .mockReturnValue(null)

    expect(dequeueNextDiagram(queue, { pickNext })?.id).toBe("c")
    expect(dequeueNextDiagram(queue, { pickNext })?.id).toBe("d")
    // No more on-screen cards: drains the remaining background tail in order.
    expect(dequeueNextDiagram(queue, { pickNext })?.id).toBe("a")
    expect(dequeueNextDiagram(queue, { pickNext })?.id).toBe("b")
    expect(queue).toHaveLength(0)
  })

  it("passes the still-pending ids to pickNext", () => {
    const queue = queueOf("a", "b", "c")
    const pickNext = vi.fn<(ids: Iterable<string>) => string | null>(() => null)

    dequeueNextDiagram(queue, { pickNext })

    expect([...pickNext.mock.calls[0][0]]).toEqual(["a", "b", "c"])
  })

  it("ignores a stale priority id that is no longer queued", () => {
    const queue = queueOf("a", "b")
    // pickNext names an id that already left the queue (e.g. just completed);
    // selection must not throw or stall — it falls back to the queue front.
    const viewportPriority = { pickNext: () => "z" }

    expect(dequeueNextDiagram(queue, viewportPriority)?.id).toBe("a")
    expect(queue.map((item) => item.id)).toEqual(["b"])
  })

  it("returns undefined for an empty queue", () => {
    expect(dequeueNextDiagram([])).toBeUndefined()
    expect(dequeueNextDiagram([], { pickNext: () => "a" })).toBeUndefined()
  })
})
