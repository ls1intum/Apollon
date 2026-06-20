import { describe, it, expect } from "vitest"
import { migrateLegacyHandle } from "@/nodes/handles/migrateLegacyHandle"
import { parseAnchor } from "@/nodes/handles/anchorModel"

describe("migrateLegacyHandle", () => {
  it("maps side centres to ratio 0.5", () => {
    expect(migrateLegacyHandle("top")).toBe("t:0.500")
    expect(migrateLegacyHandle("right")).toBe("r:0.500")
    expect(migrateLegacyHandle("bottom")).toBe("b:0.500")
    expect(migrateLegacyHandle("left")).toBe("l:0.500")
  })

  it("maps corners to true corners (0.0 / 1.0), dropping the old band", () => {
    expect(migrateLegacyHandle("top-left")).toBe("t:0.000")
    expect(migrateLegacyHandle("top-right")).toBe("t:1.000")
    expect(migrateLegacyHandle("bottom-left")).toBe("b:0.000")
    expect(migrateLegacyHandle("bottom-right")).toBe("b:1.000")
    expect(migrateLegacyHandle("right-top")).toBe("r:0.000")
    expect(migrateLegacyHandle("right-bottom")).toBe("r:1.000")
    expect(migrateLegacyHandle("left-top")).toBe("l:0.000")
    expect(migrateLegacyHandle("left-bottom")).toBe("l:1.000")
  })

  it("maps mid-corner quarter handles to 0.25 / 0.75", () => {
    expect(migrateLegacyHandle("top-mid-left")).toBe("t:0.250")
    expect(migrateLegacyHandle("top-mid-right")).toBe("t:0.750")
    expect(migrateLegacyHandle("right-mid-top")).toBe("r:0.250")
    expect(migrateLegacyHandle("right-mid-bottom")).toBe("r:0.750")
    expect(migrateLegacyHandle("bottom-mid-left")).toBe("b:0.250")
    expect(migrateLegacyHandle("bottom-mid-right")).toBe("b:0.750")
    expect(migrateLegacyHandle("left-mid-top")).toBe("l:0.250")
    expect(migrateLegacyHandle("left-mid-bottom")).toBe("l:0.750")
  })

  it("maps the hidden between-slots to their eighth ratios", () => {
    expect(migrateLegacyHandle("top-between-left-mid-left")).toBe("t:0.125")
    expect(migrateLegacyHandle("top-between-mid-left-center")).toBe("t:0.375")
    expect(migrateLegacyHandle("top-between-center-mid-right")).toBe("t:0.625")
    expect(migrateLegacyHandle("top-between-mid-right-right")).toBe("t:0.875")
    expect(migrateLegacyHandle("bottom-between-mid-left-left")).toBe("b:0.125")
    expect(migrateLegacyHandle("left-between-bottom-mid-bottom")).toBe(
      "l:0.875"
    )
  })

  it("is idempotent for ids already in anchor form", () => {
    for (const id of ["t:0.000", "r:0.500", "b:1.000", "l:0.35"]) {
      expect(migrateLegacyHandle(id)).toBe(id)
    }
  })

  it("falls back to the side centre for unknown ids, never dropping the edge", () => {
    expect(migrateLegacyHandle("top-something-weird")).toBe("t:0.500")
    expect(migrateLegacyHandle("rightish")).toBe("r:0.500")
    expect(migrateLegacyHandle("garbage")).toBe("t:0.500")
    expect(migrateLegacyHandle("")).toBe("t:0.500")
    expect(migrateLegacyHandle(null)).toBe("t:0.500")
    expect(migrateLegacyHandle(undefined)).toBe("t:0.500")
  })

  it("always returns a parseable anchor", () => {
    for (const id of [
      "top",
      "top-left",
      "right-mid-bottom",
      "bottom-between-center-mid-left",
      "weird",
      "",
    ]) {
      expect(parseAnchor(migrateLegacyHandle(id))).not.toBeNull()
    }
  })
})
