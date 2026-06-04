import { beforeEach, describe, expect, it } from "vitest"
import { DiagramView } from "@/types"
import {
  addSharedDiagramEntry,
  getSharedDiagramEntries,
  markSharedDiagramCopied,
  subscribeToSharedDiagramChange,
  updateSharedDiagramView,
} from "./sharedDiagramStorage"
import {
  buildSharedDiagramPath,
  buildSharedDiagramUrl,
  getSharedDiagramViewBadge,
} from "./sharedDiagramLinks"

describe("shared diagram link helpers", () => {
  it("builds shared diagram paths and URLs for every view", () => {
    for (const view of Object.values(DiagramView)) {
      expect(buildSharedDiagramPath("abc", view)).toBe(
        `/shared/abc?view=${view}`
      )
      expect(buildSharedDiagramUrl("abc", view, "https://example.test")).toBe(
        `https://example.test/shared/abc?view=${view}`
      )
    }
  })

  it("labels shared modes for dashboard badges", () => {
    expect(getSharedDiagramViewBadge(DiagramView.EDIT)).toBe("Edit mode")
    expect(getSharedDiagramViewBadge(DiagramView.COLLABORATE)).toBe(
      "Collaboration mode"
    )
    expect(getSharedDiagramViewBadge(DiagramView.GIVE_FEEDBACK)).toBe(
      "Feedback mode"
    )
    expect(getSharedDiagramViewBadge(DiagramView.SEE_FEEDBACK)).toBe(
      "Review mode"
    )
  })
})

describe("shared diagram storage", () => {
  beforeEach(() => {
    localStorage.clear()
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
