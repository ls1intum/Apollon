import { describe, it, expect } from "vitest"
import { sanitizeCollaborationViewport } from "@/utils/collaboration"

// `sanitizeCollaborationViewport` is the trust boundary for peer-supplied
// viewports before they reach React Flow's `setViewport`. The asserts target
// the values that actually corrupt the canvas transform — NaN/Infinity, a
// non-positive zoom, missing or wrong-typed fields — rather than re-stating the
// happy path.
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
