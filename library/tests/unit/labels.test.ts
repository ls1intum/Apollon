import { describe, expect, it } from "vitest"
import { DEFAULT_LABELS, mergeLabels } from "@/i18n/labels"

describe("mergeLabels", () => {
  it("fills labels introduced after a host's partial dictionary was written", () => {
    const labels = mergeLabels({ zoomIn: "Vergrößern" })

    expect(labels.zoomIn).toBe("Vergrößern")
    expect(labels.moveEdgeWaypoint).toBe(DEFAULT_LABELS.moveEdgeWaypoint)
  })
})
