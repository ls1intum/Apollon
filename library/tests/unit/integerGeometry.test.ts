import { describe, it, expect } from "vitest"
import {
  distSqInt,
  isqrt,
  segLenInt,
  turnBucket,
} from "@/utils/geometry/integerGeometry"

describe("isqrt — exact integer floor square root", () => {
  it("matches a golden table of small values", () => {
    const golden: Array<[number, number]> = [
      [0, 0],
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 2],
      [5, 2],
      [8, 2],
      [9, 3],
      [15, 3],
      [16, 4],
      [24, 4],
      [25, 5],
      [26, 5],
      [99, 9],
      [100, 10],
      [101, 10],
    ]
    for (const [input, expected] of golden) expect(isqrt(input)).toBe(expected)
  })

  it("is exact on perfect squares and their boundaries", () => {
    for (let n = 0; n <= 5000; n++) {
      const sq = n * n
      expect(isqrt(sq)).toBe(n)
      if (n > 0) {
        // Just below a perfect square floors to n-1; just above still floors to n.
        expect(isqrt(sq - 1)).toBe(n - 1)
        expect(isqrt(sq + 1)).toBe(n)
      }
    }
  })

  it("is exact for large values including near 2^53", () => {
    const cases: Array<[number, number]> = [
      [1_000_000, 1000],
      [999_999, 999],
      [1_000_000_000_000, 1_000_000],
      [999_999_999_999, 999_999],
      [Number.MAX_SAFE_INTEGER, 94_906_265], // floor(sqrt(2^53 - 1))
      [2 ** 52, 67_108_864], // 2^26 exactly
    ]
    for (const [input, expected] of cases) {
      expect(isqrt(input)).toBe(expected)
      // Defining property: r*r <= n < (r+1)*(r+1).
      const r = isqrt(input)
      expect(r * r).toBeLessThanOrEqual(input)
      expect((r + 1) * (r + 1)).toBeGreaterThan(input)
    }
  })

  it("rejects negative and non-integer inputs", () => {
    expect(() => isqrt(-1)).toThrow(RangeError)
    expect(() => isqrt(2.5)).toThrow(RangeError)
  })
})

describe("segLenInt / distSqInt", () => {
  it("computes exact squared distance and floored length", () => {
    expect(distSqInt({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(25)
    expect(segLenInt({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
    // 5-12-13 triple
    expect(segLenInt({ x: 1, y: 1 }, { x: 6, y: 13 })).toBe(13)
    // Non-integer true length floors down.
    expect(segLenInt({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(1) // sqrt(2) -> 1
    expect(segLenInt({ x: 0, y: 0 }, { x: 2, y: 2 })).toBe(2) // sqrt(8) -> 2
  })
})

describe("turnBucket — integer angle classification", () => {
  const cases: Array<[string, [number, number], [number, number], number]> = [
    ["dead straight", [1, 0], [1, 0], 0],
    ["straight (scaled)", [2, 0], [5, 0], 0],
    ["gentle ~26deg", [1, 0], [2, 1], 0],
    ["exactly 45deg (inclusive)", [1, 0], [1, 1], 0],
    ["~63deg", [1, 0], [1, 2], 1],
    ["right angle", [1, 0], [0, 1], 1],
    ["right angle other sign", [1, 0], [0, -1], 1],
    ["~135deg", [1, 0], [-1, 1], 2],
    ["hairpin reverse", [1, 0], [-1, 0], 2],
    ["degenerate incoming", [0, 0], [1, 0], 0],
    ["degenerate outgoing", [1, 0], [0, 0], 0],
  ]
  it.each(cases)("%s", (_name, u, v, expected) => {
    expect(turnBucket(u[0], u[1], v[0], v[1])).toBe(expected)
  })

  it("is sign-symmetric in the cross product", () => {
    // Turning left vs right by the same magnitude lands in the same bucket.
    expect(turnBucket(1, 0, 1, 2)).toBe(turnBucket(1, 0, 1, -2))
    expect(turnBucket(1, 0, -1, 1)).toBe(turnBucket(1, 0, -1, -1))
  })

  it("stays exact for large coordinate magnitudes (no overflow)", () => {
    // dot^2 / cross^2 here far exceed 2^53; BigInt keeps them exact.
    expect(turnBucket(100_000, 0, 100_000, 0)).toBe(0)
    expect(turnBucket(100_000, 0, 0, 100_000)).toBe(1)
    expect(turnBucket(100_000, 1, -100_000, 1)).toBe(2)
  })
})
