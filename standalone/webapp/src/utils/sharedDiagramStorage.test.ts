import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DiagramView } from "@/types"
import {
  addSharedDiagramEntry,
  clearSharedDiagramExpiredState,
  getSharedDiagramEntries,
  markSharedDiagramExpired,
  markSharedDiagramCopied,
  pruneExpiredSharedDiagrams,
  subscribeToSharedDiagramChange,
  updateSharedDiagramView,
} from "./sharedDiagramStorage"
import {
  buildSharedDiagramUrl,
  getSharedDiagramViewBadge,
  isDiagramView,
} from "./sharedDiagramLinks"

describe("shared diagram link helpers", () => {
  it("builds shared diagram URLs for every view", () => {
    for (const view of Object.values(DiagramView)) {
      expect(buildSharedDiagramUrl("abc", view, "https://example.test")).toBe(
        `https://example.test/shared/abc?view=${view}`
      )
    }
  })

  it("accepts only real DiagramView values (the route validateSearch guard)", () => {
    for (const view of Object.values(DiagramView)) {
      expect(isDiagramView(view)).toBe(true)
    }
    expect(isDiagramView("bogus")).toBe(false)
    expect(isDiagramView(undefined)).toBe(false)
    expect(isDiagramView(42)).toBe(false)
  })

  it("labels shared modes for dashboard badges", () => {
    expect(getSharedDiagramViewBadge(DiagramView.EDIT)).toBe("Edit")
    expect(getSharedDiagramViewBadge(DiagramView.COLLABORATE)).toBe(
      "Collaborate"
    )
    expect(getSharedDiagramViewBadge(DiagramView.GIVE_FEEDBACK)).toBe(
      "Feedback"
    )
    expect(getSharedDiagramViewBadge(DiagramView.SEE_FEEDBACK)).toBe("Review")
  })
})

describe("shared diagram storage", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("migrates old entries to edit mode", () => {
    localStorage.setItem(
      "sharedDiagramStore",
      JSON.stringify({
        entries: [{ id: "legacy", sharedAt: "2026-01-01T00:00:00.000Z" }],
      })
    )

    expect(getSharedDiagramEntries()).toEqual([
      {
        id: "legacy",
        sharedAt: "2026-01-01T00:00:00.000Z",
        favorite: false,
        lastSharedView: DiagramView.EDIT,
        sourceModelId: undefined,
        lastCopiedAt: undefined,
        expiredAt: undefined,
      },
    ])
  })

  it("stores and updates remembered link mode metadata", () => {
    addSharedDiagramEntry("shared-1", {
      lastSharedView: DiagramView.COLLABORATE,
      sourceModelId: "local-1",
    })

    expect(getSharedDiagramEntries()[0]).toMatchObject({
      id: "shared-1",
      favorite: false,
      lastSharedView: DiagramView.COLLABORATE,
      sourceModelId: "local-1",
    })

    updateSharedDiagramView("shared-1", DiagramView.GIVE_FEEDBACK)
    expect(getSharedDiagramEntries()[0].lastSharedView).toBe(
      DiagramView.GIVE_FEEDBACK
    )

    markSharedDiagramCopied("shared-1", DiagramView.SEE_FEEDBACK)
    const copiedEntry = getSharedDiagramEntries()[0]
    expect(copiedEntry.lastSharedView).toBe(DiagramView.SEE_FEEDBACK)
    expect(copiedEntry.lastCopiedAt).toEqual(expect.any(String))
  })

  it("keeps expired shared diagrams in storage until explicitly removed", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"))

    addSharedDiagramEntry("shared-1", {
      lastSharedView: DiagramView.EDIT,
    })
    markSharedDiagramExpired("shared-1")

    expect(getSharedDiagramEntries()).toHaveLength(1)
    expect(getSharedDiagramEntries()[0].expiredAt).toBe(
      "2026-06-01T12:00:00.000Z"
    )

    vi.setSystemTime(new Date("2026-06-08T11:59:59.000Z"))
    expect(getSharedDiagramEntries()).toHaveLength(1)

    vi.setSystemTime(new Date("2026-06-08T12:00:00.000Z"))
    expect(getSharedDiagramEntries()).toHaveLength(1)
  })

  it("clears expired state when a shared diagram becomes active again", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"))

    addSharedDiagramEntry("shared-1", {
      lastSharedView: DiagramView.COLLABORATE,
    })
    markSharedDiagramExpired("shared-1")
    clearSharedDiagramExpiredState("shared-1")

    expect(getSharedDiagramEntries()[0]).toMatchObject({
      id: "shared-1",
      lastSharedView: DiagramView.COLLABORATE,
      expiredAt: undefined,
    })
  })

  it("removes expired shared diagrams older than 7 days when pruned", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-08T12:00:00.000Z"))

    addSharedDiagramEntry("shared-1", {
      lastSharedView: DiagramView.EDIT,
    })
    markSharedDiagramExpired("shared-1", "2026-06-01T11:59:59.000Z")

    pruneExpiredSharedDiagrams()

    expect(getSharedDiagramEntries()).toEqual([])
  })

  it("keeps expired shared diagrams newer than 7 days when pruned", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-08T12:00:00.000Z"))

    addSharedDiagramEntry("shared-1", {
      lastSharedView: DiagramView.EDIT,
    })
    markSharedDiagramExpired("shared-1", "2026-06-01T12:00:01.000Z")

    pruneExpiredSharedDiagrams()

    expect(getSharedDiagramEntries()).toHaveLength(1)
    expect(getSharedDiagramEntries()[0].expiredAt).toBe(
      "2026-06-01T12:00:01.000Z"
    )
  })

  it("keeps non-expired shared diagrams when pruned", () => {
    addSharedDiagramEntry("shared-1", {
      lastSharedView: DiagramView.SEE_FEEDBACK,
    })

    pruneExpiredSharedDiagrams()

    expect(getSharedDiagramEntries()).toHaveLength(1)
    expect(getSharedDiagramEntries()[0]).toMatchObject({
      id: "shared-1",
      expiredAt: undefined,
      lastSharedView: DiagramView.SEE_FEEDBACK,
    })
  })

  it("does not error when pruning empty storage", () => {
    expect(() => pruneExpiredSharedDiagrams()).not.toThrow()
    expect(getSharedDiagramEntries()).toEqual([])
  })

  it("notifies same-tab subscribers on every write", () => {
    let notifications = 0
    const unsubscribe = subscribeToSharedDiagramChange(() => {
      notifications += 1
    })

    addSharedDiagramEntry("shared-1", { lastSharedView: DiagramView.EDIT })
    updateSharedDiagramView("shared-1", DiagramView.COLLABORATE)
    expect(notifications).toBe(2)

    unsubscribe()
    addSharedDiagramEntry("shared-2")
    expect(notifications).toBe(2)
  })
})
