import { describe, it, expect } from "vitest"
import {
  getOccupiedInterfaceSides,
  pickInterfaceLabelSide,
  computeInterfaceLabelSide,
  type CardinalSide,
} from "@/utils/geometry/interfaceLabelLayout"

const edge = (
  source: string,
  target: string,
  sourceHandle: string | null,
  targetHandle: string | null
) => ({ source, target, sourceHandle, targetHandle })

const occ = (...sides: CardinalSide[]) => new Set(sides)

describe("getOccupiedInterfaceSides", () => {
  it("returns an empty set when no edge touches the node", () => {
    expect(getOccupiedInterfaceSides([], "iface").size).toBe(0)
    expect(
      getOccupiedInterfaceSides([edge("a", "b", "right", "left")], "iface").size
    ).toBe(0)
  })

  it("uses sourceHandle when the node is the source", () => {
    expect(
      getOccupiedInterfaceSides([edge("iface", "x", "bottom", "left")], "iface")
    ).toEqual(occ("bottom"))
  })

  it("uses targetHandle when the node is the target (endpoint asymmetry)", () => {
    // From iface's view this edge attaches at its own side (top), NOT the
    // source's bottom handle.
    expect(
      getOccupiedInterfaceSides([edge("x", "iface", "bottom", "top")], "iface")
    ).toEqual(occ("top"))
  })

  it("collapses multiple edges on the same side", () => {
    expect(
      getOccupiedInterfaceSides(
        [edge("iface", "x", "bottom", "l"), edge("iface", "y", "bottom", "r")],
        "iface"
      )
    ).toEqual(occ("bottom"))
  })

  it("records BOTH ends of a self-loop", () => {
    expect(
      getOccupiedInterfaceSides(
        [edge("iface", "iface", "top", "right")],
        "iface"
      )
    ).toEqual(occ("top", "right"))
  })

  it("ignores null and non-directional handle ids", () => {
    expect(
      getOccupiedInterfaceSides(
        [
          edge("iface", "x", null, null),
          edge("iface", "y", "bottom-mid-left", null),
        ],
        "iface"
      ).size
    ).toBe(0)
  })
})

describe("pickInterfaceLabelSide", () => {
  it("defaults to bottom with no edges", () => {
    expect(pickInterfaceLabelSide(occ())).toBe("bottom")
  })

  it("moves off the bottom edge to top (the edge-from-below case)", () => {
    expect(pickInterfaceLabelSide(occ("bottom"))).toBe("top")
  })

  it("keeps bottom when only a non-bottom side is taken (minimal churn)", () => {
    expect(pickInterfaceLabelSide(occ("top"))).toBe("bottom")
    expect(pickInterfaceLabelSide(occ("left"))).toBe("bottom")
  })

  it("picks the first free side for 2-3 occupied", () => {
    expect(pickInterfaceLabelSide(occ("bottom", "top"))).toBe("left")
    expect(pickInterfaceLabelSide(occ("bottom", "left"))).toBe("top")
    expect(pickInterfaceLabelSide(occ("bottom", "top", "left"))).toBe("right")
  })

  it("moves to a diagonal corner when all four sides are occupied", () => {
    // Every cardinal edge leaves along an axis, so a corner crosses none.
    expect(pickInterfaceLabelSide(occ("bottom", "top", "left", "right"))).toBe(
      "bottom-right"
    )
  })

  it("uses a badge-safe diagonal (bottom-left) when all sides are occupied and the badge shows", () => {
    expect(
      pickInterfaceLabelSide(occ("bottom", "top", "left", "right"), {
        badgeTopRight: true,
      })
    ).toBe("bottom-left")
  })

  describe("with the top-right assessment badge present", () => {
    const badge = { badgeTopRight: true }

    it("moves a bottom edge to left, not top (badge-safe)", () => {
      expect(pickInterfaceLabelSide(occ("bottom"), badge)).toBe("left")
    })

    it("prefers top over right when both could be free (right grazes the badge)", () => {
      // bottom+left taken → top is next, right last.
      expect(pickInterfaceLabelSide(occ("bottom", "left"), badge)).toBe("top")
    })

    it("only uses right when it is the sole free side", () => {
      expect(pickInterfaceLabelSide(occ("bottom", "top", "left"), badge)).toBe(
        "right"
      )
    })
  })
})

describe("computeInterfaceLabelSide", () => {
  it("flips an edge-from-below interface to top (editable view)", () => {
    const side = computeInterfaceLabelSide(
      [edge("comp", "iface", "top", "bottom")],
      "iface"
    )
    expect(side).toBe("top")
  })

  it("flips an edge-from-below interface to left in assessment view", () => {
    const side = computeInterfaceLabelSide(
      [edge("comp", "iface", "top", "bottom")],
      "iface",
      { badgeTopRight: true }
    )
    expect(side).toBe("left")
  })
})
