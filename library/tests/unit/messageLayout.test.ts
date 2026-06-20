import { describe, it, expect } from "vitest"
import {
  computeMessageLayout,
  ARROW_SIZE,
  STACK_SPACING,
} from "@/edges/labelTypes/messageLayout"
import type { MessageData } from "@/edges/EdgeProps"

type IPointLike = { x: number; y: number }

const fwd = (id: string, text = "f"): MessageData => ({
  id,
  text,
  direction: "target",
})
const bwd = (id: string, text = "b"): MessageData => ({
  id,
  text,
  direction: "source",
})

const VERTICAL = { src: { x: 100, y: 0 }, tgt: { x: 100, y: 300 } } // source above
const HORIZONTAL = { src: { x: 0, y: 50 }, tgt: { x: 300, y: 50 } } // source left

describe("computeMessageLayout — grouping", () => {
  it("partitions messages by direction, preserving order", () => {
    const msgs = [fwd("1"), bwd("2"), fwd("3"), bwd("4")]
    const { forward, backward } = computeMessageLayout(
      msgs,
      VERTICAL.src,
      VERTICAL.tgt,
      false
    )
    expect(forward.messages.map((m) => m.id)).toEqual(["1", "3"])
    expect(backward.messages.map((m) => m.id)).toEqual(["2", "4"])
  })
})

describe("computeMessageLayout — vertical edge sides (regression for PR #645 inversion)", () => {
  it("forward labels go RIGHT (+x), backward go LEFT (-x)", () => {
    const { forward, backward } = computeMessageLayout(
      [fwd("1"), bwd("2")],
      VERTICAL.src,
      VERTICAL.tgt,
      false
    )
    expect(forward.textOrigin.x).toBeGreaterThan(0)
    expect(forward.arrowOrigin.x).toBeGreaterThan(0)
    expect(backward.textOrigin.x).toBeLessThan(0)
    expect(backward.arrowOrigin.x).toBeLessThan(0)
  })

  it("places the two sides as exact mirror images", () => {
    const { forward, backward } = computeMessageLayout(
      [fwd("1"), bwd("2")],
      VERTICAL.src,
      VERTICAL.tgt,
      false
    )
    expect(forward.textOrigin.x).toBe(-backward.textOrigin.x)
    expect(forward.textAnchor).toBe("start")
    expect(backward.textAnchor).toBe("end")
  })

  it("keeps text clear of the line by at least the arrow width", () => {
    const { forward, backward } = computeMessageLayout(
      [fwd("1"), bwd("2")],
      VERTICAL.src,
      VERTICAL.tgt,
      false
    )
    expect(forward.textOrigin.x).toBeGreaterThan(ARROW_SIZE)
    expect(backward.textOrigin.x).toBeLessThan(-ARROW_SIZE)
  })

  it("keeps sides stable when source/target are swapped (orientation-independent)", () => {
    const a = computeMessageLayout(
      [fwd("1")],
      VERTICAL.src,
      VERTICAL.tgt,
      false
    )
    const b = computeMessageLayout(
      [fwd("1")],
      VERTICAL.tgt,
      VERTICAL.src,
      false
    )
    expect(Math.sign(a.forward.textOrigin.x)).toBe(
      Math.sign(b.forward.textOrigin.x)
    )
  })
})

describe("computeMessageLayout — horizontal edge sides", () => {
  it("forward labels go ABOVE (-y), backward go BELOW (+y)", () => {
    const { forward, backward } = computeMessageLayout(
      [fwd("1"), bwd("2")],
      HORIZONTAL.src,
      HORIZONTAL.tgt,
      true
    )
    expect(forward.textOrigin.y).toBeLessThan(0)
    expect(backward.textOrigin.y).toBeGreaterThan(0)
  })
})

describe("computeMessageLayout — arrow rotations", () => {
  it.each([
    // isHorizontal, source,         target,          fwdRot, bwdRot
    [true, { x: 0, y: 0 }, { x: 300, y: 0 }, 0, 180], // source left  → forward Right
    [true, { x: 300, y: 0 }, { x: 0, y: 0 }, 180, 0], // source right → forward Left
    [false, { x: 0, y: 0 }, { x: 0, y: 300 }, 90, -90], // source above → forward Down
    [false, { x: 0, y: 300 }, { x: 0, y: 0 }, -90, 90], // source below → forward Up
  ])(
    "isHorizontal=%s yields the correct rotations",
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

describe("computeMessageLayout — stacking", () => {
  it("stacks vertical-edge groups downward with constant spacing", () => {
    const { forward, backward } = computeMessageLayout(
      [fwd("1"), bwd("2")],
      VERTICAL.src,
      VERTICAL.tgt,
      false
    )
    expect(forward.stackStep).toEqual({ x: 0, y: STACK_SPACING })
    expect(backward.stackStep).toEqual({ x: 0, y: STACK_SPACING })
  })

  it("stacks horizontal-edge groups away from the line", () => {
    const { forward, backward } = computeMessageLayout(
      [fwd("1"), bwd("2")],
      HORIZONTAL.src,
      HORIZONTAL.tgt,
      true
    )
    expect(forward.stackStep.y).toBe(-STACK_SPACING) // upward
    expect(backward.stackStep.y).toBe(STACK_SPACING) // downward
  })
})
