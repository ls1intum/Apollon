import { describe, it, expect } from "vitest"
import { measureTextWidth } from "@/utils/textUtils"

describe("measureTextWidth", () => {
  it("returns a number", () => {
    const width = measureTextWidth("hello")
    expect(typeof width).toBe("number")
  })

  it("returns text.length * 8 for the mocked canvas context", () => {
    // setup.ts mocks measureText to return { width: text.length * 8 }
    expect(measureTextWidth("hello")).toBe(40) // 5 * 8
    expect(measureTextWidth("ab")).toBe(16) // 2 * 8
  })

  it("returns 0 for empty string", () => {
    expect(measureTextWidth("")).toBe(0)
  })

  it("handles long strings", () => {
    const longStr = "a".repeat(100)
    expect(measureTextWidth(longStr)).toBe(800) // 100 * 8
  })

  it("accepts a custom font parameter without error", () => {
    const width = measureTextWidth("test", "bold 20px Arial")
    expect(typeof width).toBe("number")
  })

  it("uses default font when not specified", () => {
    // Should not throw and should return mock value
    const width = measureTextWidth("x")
    expect(width).toBe(8) // 1 * 8
  })

  it("returns consistent results for same input", () => {
    const w1 = measureTextWidth("abc")
    const w2 = measureTextWidth("abc")
    expect(w1).toBe(w2)
  })

  it("returns different widths for different length strings", () => {
    const short = measureTextWidth("ab")
    const long = measureTextWidth("abcdef")
    expect(long).toBeGreaterThan(short)
  })
})
