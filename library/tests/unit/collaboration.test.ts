import { describe, it, expect } from "vitest"
import {
  sanitizeCollaborationViewport,
  sanitizeDraggingNodes,
} from "@/utils/collaboration"

// `sanitizeCollaborationViewport` is the trust boundary for peer-supplied
// viewports before they reach React Flow's `setViewport`. The asserts target
// the values that actually corrupt the canvas transform — NaN/Infinity, a
// non-positive zoom, missing or wrong-typed fields — rather than re-stating the
// happy path. The RAF/awareness wiring in `ViewportFollow` is deliberately out
// of unit scope (it needs a live xyflow + awareness harness); this covers the
// one piece of pure, security-relevant logic.
describe("sanitizeCollaborationViewport", () => {
  it("passes through a well-formed viewport", () => {
    expect(
      sanitizeCollaborationViewport({ x: -120.5, y: 40, zoom: 1.5 })
    ).toEqual({
      x: -120.5,
      y: 40,
      zoom: 1.5,
    })
  })

  it("rejects NaN and Infinity coordinates", () => {
    expect(sanitizeCollaborationViewport({ x: NaN, y: 0, zoom: 1 })).toBeNull()
    expect(
      sanitizeCollaborationViewport({ x: 0, y: Infinity, zoom: 1 })
    ).toBeNull()
  })

  it("rejects a non-positive zoom that would break the transform", () => {
    expect(sanitizeCollaborationViewport({ x: 0, y: 0, zoom: 0 })).toBeNull()
    expect(sanitizeCollaborationViewport({ x: 0, y: 0, zoom: -1 })).toBeNull()
  })

  it("rejects missing fields and non-numeric values", () => {
    expect(sanitizeCollaborationViewport({ x: 0, y: 0 })).toBeNull()
    expect(sanitizeCollaborationViewport({ x: "0", y: 0, zoom: 1 })).toBeNull()
  })

  it("rejects non-object input", () => {
    expect(sanitizeCollaborationViewport(null)).toBeNull()
    expect(sanitizeCollaborationViewport(undefined)).toBeNull()
    expect(sanitizeCollaborationViewport(42)).toBeNull()
  })

  it("drops extra fields, returning only x/y/zoom", () => {
    expect(
      sanitizeCollaborationViewport({ x: 1, y: 2, zoom: 1, evil: "drop me" })
    ).toEqual({ x: 1, y: 2, zoom: 1 })
  })
})

// `sanitizeDraggingNodes` is the trust boundary for the peer-supplied live-drag
// payload before the overlay reader iterates it. A non-array value, or an entry
// without a string id / finite position, would otherwise throw in the awareness
// handler and break the overlay for everyone reading that peer.
describe("sanitizeDraggingNodes", () => {
  it("passes through well-formed entries", () => {
    expect(
      sanitizeDraggingNodes([
        { id: "a", position: { x: 1, y: 2 } },
        { id: "b", position: { x: 3, y: 4 }, width: 200, height: 100 },
      ])
    ).toEqual([
      { id: "a", position: { x: 1, y: 2 } },
      { id: "b", position: { x: 3, y: 4 }, width: 200, height: 100 },
    ])
  })

  it("returns null for a non-array (the value that throws `for...of`)", () => {
    expect(sanitizeDraggingNodes({})).toBeNull()
    expect(sanitizeDraggingNodes("nope")).toBeNull()
    expect(sanitizeDraggingNodes(null)).toBeNull()
  })

  it("drops entries with a missing/wrong-typed id or non-finite position", () => {
    expect(
      sanitizeDraggingNodes([
        { position: { x: 1, y: 2 } }, // no id
        { id: 5, position: { x: 1, y: 2 } }, // non-string id
        { id: "c", position: { x: NaN, y: 2 } }, // non-finite
        { id: "d" }, // no position
        { id: "keep", position: { x: 0, y: 0 } },
      ])
    ).toEqual([{ id: "keep", position: { x: 0, y: 0 } }])
  })

  it("keeps null width/height but drops non-finite ones", () => {
    expect(
      sanitizeDraggingNodes([
        { id: "a", position: { x: 0, y: 0 }, width: null, height: 10 },
        { id: "b", position: { x: 0, y: 0 }, width: Infinity },
      ])
    ).toEqual([
      { id: "a", position: { x: 0, y: 0 }, width: null, height: 10 },
      { id: "b", position: { x: 0, y: 0 } },
    ])
  })
})
