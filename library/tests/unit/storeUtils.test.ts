import { describe, it, expect } from "vitest"
import { deepEqual } from "@/utils/storeUtils"

// Behavioural test for the diagram-store equality short-circuit. The function
// is custom (NOT a JS built-in), so the asserts focus on the contracts the
// store relies on: order-independence, undefined-vs-missing parity, and
// realistic nested shapes — not tautologies like `42 === 42`.
describe("deepEqual", () => {
  it("treats key insertion order as semantically irrelevant", () => {
    expect(deepEqual({ x: 1, y: 2 }, { y: 2, x: 1 })).toBe(true)
  })

  it("treats explicit undefined as equal to missing property", () => {
    expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true)
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(true)
  })

  it("compares nested diagram-shaped payloads", () => {
    const a = {
      nodes: [{ id: "1", pos: { x: 0, y: 0 }, data: { label: "A" } }],
      edges: [{ id: "e1", points: [{ x: 0, y: 0 }] }],
    }
    const b = {
      nodes: [{ id: "1", pos: { x: 0, y: 0 }, data: { label: "A" } }],
      edges: [{ id: "e1", points: [{ x: 0, y: 0 }] }],
    }
    expect(deepEqual(a, b)).toBe(true)
  })

  it("detects a single nested value difference", () => {
    const a = { nodes: [{ pos: { x: 0, y: 0 } }] }
    const b = { nodes: [{ pos: { x: 0, y: 1 } }] }
    expect(deepEqual(a, b)).toBe(false)
  })

  it("returns false when array lengths differ", () => {
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
  })

  it("returns false across object/array/primitive boundaries", () => {
    expect(deepEqual({} as unknown, [] as unknown)).toBe(false)
    expect(deepEqual({}, null)).toBe(false)
    expect(deepEqual([1], 1)).toBe(false)
  })

  it("returns true for identical NaN (via Object.is)", () => {
    expect(deepEqual(NaN, NaN)).toBe(true)
  })
})
