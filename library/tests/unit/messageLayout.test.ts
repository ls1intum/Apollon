import { describe, it, expect } from "vitest"
import { computeMessageLayout } from "@/edges/labelTypes/messageLayout"
import type { MessageData } from "@/edges/EdgeProps"

type IPointLike = { x: number; y: number }

const fwd = (id: string): MessageData => ({ id, text: "f", direction: "target" })
const bwd = (id: string): MessageData => ({ id, text: "b", direction: "source" })

const VERTICAL = { src: { x: 100, y: 0 }, tgt: { x: 100, y: 300 } } // source above
const HORIZONTAL = { src: { x: 0, y: 50 }, tgt: { x: 300, y: 50 } } // source left

describe("computeMessageLayout", () => {
  it("partitions messages by direction, preserving order", () => {
    const { forward, backward } = computeMessageLayout(
      [fwd("1"), bwd("2"), fwd("3"), bwd("4")],
      VERTICAL.src,
      VERTICAL.tgt,
      false
    )
    expect(forward.messages.map((m) => m.id)).toEqual(["1", "3"])
    expect(backward.messages.map((m) => m.id)).toEqual(["2", "4"])
  })

  // Regression for PR #645: the vertical branch had forward/backward swapped.
  it("puts forward right / backward left on a vertical edge (mirror images)", () => {
    const { forward, backward } = computeMessageLayout(
      [fwd("1"), bwd("2")],
      VERTICAL.src,
      VERTICAL.tgt,
      false
    )
    expect(forward.textOrigin.x).toBeGreaterThan(0)
    expect(backward.textOrigin.x).toBeLessThan(0)
    expect(forward.textOrigin.x).toBe(-backward.textOrigin.x)
    expect(forward.textAnchor).toBe("start")
    expect(backward.textAnchor).toBe("end")
  })

  it("puts forward above / backward below and centres them on a horizontal edge", () => {
    const { forward, backward } = computeMessageLayout(
      [fwd("1"), bwd("2")],
      HORIZONTAL.src,
      HORIZONTAL.tgt,
      true
    )
    expect(forward.textOrigin.y).toBeLessThan(0)
    expect(backward.textOrigin.y).toBeGreaterThan(0)
    expect(forward.textOrigin.x).toBe(0)
    expect(backward.textOrigin.x).toBe(0)
    expect(forward.textAnchor).toBe("middle")
  })

  it("fixes the label side by orientation, not by which node is the source", () => {
    const a = computeMessageLayout([fwd("1")], VERTICAL.src, VERTICAL.tgt, false)
    const b = computeMessageLayout([fwd("1")], VERTICAL.tgt, VERTICAL.src, false)
    expect(Math.sign(a.forward.textOrigin.x)).toBe(
      Math.sign(b.forward.textOrigin.x)
    )
  })

  it("stacks the two groups away from the line on a horizontal edge", () => {
    const { forward, backward } = computeMessageLayout(
      [fwd("1"), bwd("2")],
      HORIZONTAL.src,
      HORIZONTAL.tgt,
      true
    )
    expect(forward.stackStep.y).toBeLessThan(0) // forward is above → stacks up
    expect(backward.stackStep.y).toBeGreaterThan(0) // backward below → stacks down
  })

  it.each([
    // isHorizontal, source,         target,          fwdRot, bwdRot
    [true, { x: 0, y: 0 }, { x: 300, y: 0 }, 0, 180], // source left  → forward Right
    [true, { x: 300, y: 0 }, { x: 0, y: 0 }, 180, 0], // source right → forward Left
    [false, { x: 0, y: 0 }, { x: 0, y: 300 }, 90, -90], // source above → forward Down
    [false, { x: 0, y: 300 }, { x: 0, y: 0 }, -90, 90], // source below → forward Up
  ])(
    "rotates arrows from endpoint geometry (horizontal=%s)",
    (isHorizontal, src, tgt, fwdRot, bwdRot) => {
      const { forward, backward } = computeMessageLayout(
        [fwd("1"), bwd("2")],
        src as IPointLike,
        tgt as IPointLike,
        isHorizontal as boolean
      )
      expect(forward.arrowRotation).toBe(fwdRot)
      expect(backward.arrowRotation).toBe(bwdRot)
    }
  )
})
