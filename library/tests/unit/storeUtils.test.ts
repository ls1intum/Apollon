import { describe, it, expect } from "vitest"
import { deepEqual } from "@/utils/storeUtils"

describe("deepEqual", () => {
  // Primitives
  it("returns true for equal numbers", () => {
    expect(deepEqual(42, 42)).toBe(true)
  })

  it("returns false for different numbers", () => {
    expect(deepEqual(1, 2)).toBe(false)
  })

  it("returns true for equal strings", () => {
    expect(deepEqual("hello", "hello")).toBe(true)
  })

  it("returns false for different strings", () => {
    expect(deepEqual("a", "b")).toBe(false)
  })

  it("returns true for two nulls", () => {
    expect(deepEqual(null, null)).toBe(true)
  })

  it("returns true for two booleans", () => {
    expect(deepEqual(true, true)).toBe(true)
    expect(deepEqual(false, false)).toBe(true)
  })

  it("returns false for different booleans", () => {
    expect(deepEqual(true, false)).toBe(false)
  })

  // Objects
  it("returns true for equal flat objects", () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
  })

  it("returns false for objects with different values", () => {
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
  })

  it("returns true for equal nested objects", () => {
    expect(deepEqual({ a: { b: { c: 3 } } }, { a: { b: { c: 3 } } })).toBe(true)
  })

  it("returns false for objects with different keys", () => {
    expect(
      deepEqual(
        { a: 1 } as Record<string, number>,
        { b: 1 } as Record<string, number>
      )
    ).toBe(false)
  })

  // Arrays
  it("returns true for equal arrays", () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
  })

  it("returns false for arrays with different values", () => {
    expect(deepEqual([1, 2], [1, 3])).toBe(false)
  })

  it("returns false for arrays with different lengths", () => {
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
  })

  // Empty
  it("returns true for two empty objects", () => {
    expect(deepEqual({}, {})).toBe(true)
  })

  it("returns true for two empty arrays", () => {
    expect(deepEqual([], [])).toBe(true)
  })

  // Mixed
  it("returns false for different types (object vs array)", () => {
    expect(deepEqual({} as unknown, [] as unknown)).toBe(false)
  })

  it("returns true for two undefined values", () => {
    expect(deepEqual(undefined, undefined)).toBe(true)
  })

  it("returns true for objects with same keys in same insertion order", () => {
    const a = { x: 1, y: 2 }
    const b = { x: 1, y: 2 }
    expect(deepEqual(a, b)).toBe(true)
  })

  it("handles complex nested structures", () => {
    const a = { nodes: [{ id: "1", pos: { x: 0, y: 0 } }], edges: [] }
    const b = { nodes: [{ id: "1", pos: { x: 0, y: 0 } }], edges: [] }
    expect(deepEqual(a, b)).toBe(true)
  })

  it("treats key insertion order as semantically irrelevant", () => {
    expect(deepEqual({ x: 1, y: 2 }, { y: 2, x: 1 })).toBe(true)
  })

  it("treats explicit undefined as equal to missing property", () => {
    expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true)
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(true)
  })

  it("returns false for primitive vs object", () => {
    expect(deepEqual({}, null)).toBe(false)
    expect(deepEqual(null, {})).toBe(false)
    expect(deepEqual([1], 1)).toBe(false)
  })
})
