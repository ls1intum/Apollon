import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { UMLModel } from "@tumaet/apollon"
import { createDiagramAutosaver } from "./createDiagramAutosaver"
import { ApiError, DiagramApiClient } from "@/services/DiagramApiClient"

vi.mock("@/services/DiagramApiClient", () => ({
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
      public meta?: Record<string, unknown>
    ) {
      super(message)
    }
  },
  DiagramApiClient: {
    sendDiagramUpdate: vi.fn(),
    fetchDiagram: vi.fn(),
  },
}))

const sendUpdate = vi.mocked(DiagramApiClient.sendDiagramUpdate)
const fetchDiagram = vi.mocked(DiagramApiClient.fetchDiagram)

const model = (tag: string) => ({ tag }) as unknown as UMLModel

/** Flush the microtask queue so awaited PUT promises settle. */
const tick = () => Promise.resolve().then(() => Promise.resolve())

beforeEach(() => {
  vi.useFakeTimers()
  sendUpdate.mockReset()
  fetchDiagram.mockReset()
  sendUpdate.mockResolvedValue({ headRev: 1, updatedAt: "" })
})

afterEach(() => {
  vi.useRealTimers()
})

describe("createDiagramAutosaver — debounce", () => {
  it("waits for the quiet period before saving, then saves once", async () => {
    const saver = createDiagramAutosaver({
      diagramId: "d1",
      getModel: () => model("a"),
      isPaused: () => false,
      collaboration: false,
      debounceMs: 1500,
      maxWaitMs: 5000,
    })

    saver.schedule()
    vi.advanceTimersByTime(1400)
    // Still inside the debounce window — old behavior (5s poll) likewise
    // wouldn't have saved yet, but the key assertion is the trailing edge.
    expect(sendUpdate).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200)
    await tick()
    expect(sendUpdate).toHaveBeenCalledTimes(1)
  })

  it("coalesces a burst of changes into a single trailing save", async () => {
    const saver = createDiagramAutosaver({
      diagramId: "d1",
      getModel: () => model("a"),
      isPaused: () => false,
      collaboration: false,
      debounceMs: 1500,
      maxWaitMs: 5000,
    })

    // 8 × 500ms = 4000ms total stays under the 5000ms maxWait, and no single
    // idle gap reaches the 1500ms debounce — so nothing fires mid-burst.
    for (let i = 0; i < 8; i++) {
      saver.schedule()
      vi.advanceTimersByTime(500)
    }
    expect(sendUpdate).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1500)
    await tick()
    expect(sendUpdate).toHaveBeenCalledTimes(1)
  })

  it("forces a save at maxWait even under a continuous change stream", async () => {
    const saver = createDiagramAutosaver({
      diagramId: "d1",
      getModel: () => model("a"),
      isPaused: () => false,
      collaboration: false,
      debounceMs: 1500,
      maxWaitMs: 5000,
    })

    // A change every 1s keeps re-arming the 1.5s debounce forever; without a
    // maxWait cap the save would never fire. It must fire by 5s.
    for (let i = 0; i < 5; i++) {
      saver.schedule()
      vi.advanceTimersByTime(1000)
    }
    await tick()
    expect(sendUpdate).toHaveBeenCalledTimes(1)
  })

  it("does not save while paused (preview)", async () => {
    let paused = true
    const saver = createDiagramAutosaver({
      diagramId: "d1",
      getModel: () => model("a"),
      isPaused: () => paused,
      collaboration: false,
      debounceMs: 1500,
      maxWaitMs: 5000,
    })

    saver.schedule()
    vi.advanceTimersByTime(5000)
    await tick()
    expect(sendUpdate).not.toHaveBeenCalled()

    // Once unpaused, the next change schedules a save normally.
    paused = false
    saver.schedule()
    vi.advanceTimersByTime(1500)
    await tick()
    expect(sendUpdate).toHaveBeenCalledTimes(1)
  })

  it("persists a paused dirty edit after preview exits, with no new change", async () => {
    let paused = true
    const saver = createDiagramAutosaver({
      diagramId: "d1",
      getModel: () => model("a"),
      isPaused: () => paused,
      collaboration: false,
      debounceMs: 1500,
      maxWaitMs: 5000,
    })

    saver.schedule()
    vi.advanceTimersByTime(5000)
    await tick()
    expect(sendUpdate).not.toHaveBeenCalled()

    // Preview exits with NO further edit; the re-armed timer still persists it.
    paused = false
    vi.advanceTimersByTime(1500)
    await tick()
    expect(sendUpdate).toHaveBeenCalledTimes(1)
  })

  it("flush() saves immediately, bypassing the debounce", async () => {
    const saver = createDiagramAutosaver({
      diagramId: "d1",
      getModel: () => model("a"),
      isPaused: () => false,
      collaboration: false,
    })

    saver.schedule()
    await saver.flush()
    expect(sendUpdate).toHaveBeenCalledTimes(1)
  })

  it("flush()+dispose() still persists an edit made during an in-flight save", async () => {
    // The first PUT is held open; while it's in flight a new edit lands, then
    // teardown does flush()+dispose(). The trailing edit must NOT be dropped.
    let resolveFirst!: () => void
    sendUpdate
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = () => resolve({ headRev: 1, updatedAt: "" })
          })
      )
      .mockResolvedValueOnce({ headRev: 2, updatedAt: "" })

    let current = "a"
    const saver = createDiagramAutosaver({
      diagramId: "d1",
      getModel: () => model(current),
      isPaused: () => false,
      collaboration: false,
    })

    // First save goes in-flight (PUT "a") and parks on the held promise.
    saver.schedule()
    void saver.flush()
    await tick()
    expect(sendUpdate).toHaveBeenCalledTimes(1)

    // A new edit arrives mid-flight, then teardown flushes and disposes.
    current = "b"
    saver.schedule()
    void saver.flush()
    saver.dispose()

    // Release the first PUT; the chained trailing save must fire with "b".
    resolveFirst()
    await tick()
    await tick()
    expect(sendUpdate).toHaveBeenCalledTimes(2)
    expect(
      (sendUpdate.mock.calls[1][1] as unknown as { tag: string }).tag
    ).toBe("b")
  })

  it("serialises saves: a third runSave during a chained save never overlaps", async () => {
    // Three-deep window: PUT#1 held → edit chains PUT#2 → while PUT#2 is in
    // flight a third edit arrives. Saves must run strictly one at a time, so no
    // more than one sendDiagramUpdate is ever unresolved at once — this is the
    // invariant the line-62 "can't overlap" comment claims.
    let inFlightCount = 0
    let maxConcurrent = 0
    const releases: Array<() => void> = []
    sendUpdate.mockImplementation(
      () =>
        new Promise((resolve) => {
          inFlightCount += 1
          maxConcurrent = Math.max(maxConcurrent, inFlightCount)
          releases.push(() => {
            inFlightCount -= 1
            resolve({ headRev: 1, updatedAt: "" })
          })
        })
    )

    let current = "a"
    const saver = createDiagramAutosaver({
      diagramId: "d1",
      getModel: () => model(current),
      isPaused: () => false,
      collaboration: false,
    })

    // PUT#1 in flight.
    saver.schedule()
    void saver.flush()
    await tick()
    expect(sendUpdate).toHaveBeenCalledTimes(1)

    // Edit + flush chains PUT#2 behind PUT#1.
    current = "b"
    saver.schedule()
    void saver.flush()

    // Release PUT#1 so the chained PUT#2 begins.
    releases[0]()
    await tick()
    await tick()
    expect(sendUpdate).toHaveBeenCalledTimes(2)

    // A third edit + flush arrives while PUT#2 is still in flight. It must NOT
    // fire a parallel PUT#3 — it chains behind PUT#2.
    current = "c"
    saver.schedule()
    void saver.flush()
    await tick()
    expect(sendUpdate).toHaveBeenCalledTimes(2)

    // Drain PUT#2, then PUT#3 fires; at no point did two PUTs overlap.
    releases[1]()
    await tick()
    await tick()
    expect(sendUpdate).toHaveBeenCalledTimes(3)
    releases[2]()
    expect(maxConcurrent).toBe(1)
  })

  it("dispose() cancels a pending save", async () => {
    const saver = createDiagramAutosaver({
      diagramId: "d1",
      getModel: () => model("a"),
      isPaused: () => false,
      collaboration: false,
      debounceMs: 1500,
    })

    saver.schedule()
    saver.dispose()
    vi.advanceTimersByTime(5000)
    await tick()
    expect(sendUpdate).not.toHaveBeenCalled()
  })
})

describe("createDiagramAutosaver — collaboration rebase", () => {
  it("rebases onto the server HEAD hint and re-PUTs on REVISION_MISMATCH", async () => {
    sendUpdate
      .mockRejectedValueOnce(
        new ApiError(409, "REVISION_MISMATCH", "stale", { currentHeadRev: 7 })
      )
      .mockResolvedValueOnce({ headRev: 8, updatedAt: "" })

    const onError = vi.fn()
    const saver = createDiagramAutosaver({
      diagramId: "d1",
      getModel: () => model("converged"),
      isPaused: () => false,
      collaboration: true,
      onError,
    })

    saver.schedule()
    await saver.flush()

    expect(sendUpdate).toHaveBeenCalledTimes(2)
    // Second PUT carries the rebased If-Match learned from the mismatch meta.
    expect(sendUpdate.mock.calls[1][2]).toEqual({ ifMatch: 7 })
    // A normal concurrent mismatch must NOT surface a toast.
    expect(onError).not.toHaveBeenCalled()
    // No HEAD re-read needed when the meta hint is present.
    expect(fetchDiagram).not.toHaveBeenCalled()
  })

  it("re-reads HEAD when the mismatch carries no rev hint", async () => {
    sendUpdate
      .mockRejectedValueOnce(new ApiError(409, "REVISION_MISMATCH", "stale"))
      .mockResolvedValueOnce({ headRev: 5, updatedAt: "" })
    fetchDiagram.mockResolvedValue({ headRev: 4 } as never)

    const saver = createDiagramAutosaver({
      diagramId: "d1",
      getModel: () => model("converged"),
      isPaused: () => false,
      collaboration: true,
    })

    saver.schedule()
    await saver.flush()

    expect(fetchDiagram).toHaveBeenCalledTimes(1)
    expect(sendUpdate.mock.calls[1][2]).toEqual({ ifMatch: 4 })
  })

  it("caps rebase retries and stops re-PUTing", async () => {
    sendUpdate.mockRejectedValue(
      new ApiError(409, "REVISION_MISMATCH", "stale", { currentHeadRev: 1 })
    )
    const onSaved = vi.fn()
    const onError = vi.fn()
    const saver = createDiagramAutosaver({
      diagramId: "d1",
      getModel: () => model("converged"),
      isPaused: () => false,
      collaboration: true,
      maxRebaseRetries: 3,
      onSaved,
      onError,
    })

    saver.schedule()
    await saver.flush()

    // 1 initial + 3 rebase retries = 4 PUTs, then it gives up quietly (no toast)
    // but does NOT report the edit saved — it stays dirty for a later retry.
    expect(sendUpdate).toHaveBeenCalledTimes(4)
    expect(onError).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it("keeps a single-editor mismatch dirty and retries with the adopted hint", async () => {
    sendUpdate.mockRejectedValueOnce(
      new ApiError(409, "REVISION_MISMATCH", "stale", { currentHeadRev: 9 })
    )

    const onSaved = vi.fn()
    const onError = vi.fn()
    const saver = createDiagramAutosaver({
      diagramId: "d1",
      getModel: () => model("a"),
      isPaused: () => false,
      collaboration: false,
      onSaved,
      onError,
    })

    saver.schedule()
    await saver.flush()
    // Single-editor: one PUT, no immediate re-PUT, no toast — and crucially the
    // edit is NOT reported saved, because no PUT reached the server.
    expect(sendUpdate).toHaveBeenCalledTimes(1)
    expect(onSaved).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()

    // Still dirty: a flush with NO new change retries, carrying the adopted hint.
    sendUpdate.mockResolvedValueOnce({ headRev: 11, updatedAt: "" })
    await saver.flush()
    expect(sendUpdate).toHaveBeenCalledTimes(2)
    expect(sendUpdate.mock.calls[1][2]).toEqual({ ifMatch: 9 })
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it("surfaces non-mismatch errors and keeps the model dirty for retry", async () => {
    sendUpdate.mockRejectedValueOnce(new ApiError(500, "INTERNAL", "boom"))
    const onError = vi.fn()
    const saver = createDiagramAutosaver({
      diagramId: "d1",
      getModel: () => model("a"),
      isPaused: () => false,
      collaboration: true,
      onError,
    })

    saver.schedule()
    await saver.flush()
    expect(onError).toHaveBeenCalledTimes(1)

    // Still dirty: a subsequent flush retries the PUT.
    sendUpdate.mockResolvedValueOnce({ headRev: 1, updatedAt: "" })
    await saver.flush()
    expect(sendUpdate).toHaveBeenCalledTimes(2)
  })
})
