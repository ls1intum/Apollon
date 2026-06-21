import { describe, it, expect } from "vitest"
import {
  computeMessageLayout,
  getMessageHostSegment,
} from "@/edges/labelTypes/messageLayout"
import type { MessageData } from "@/edges/EdgeProps"
import type { IPoint } from "@/edges/Connection"

const pt = (x: number, y: number): IPoint => ({ x, y })

const fwd = (id: string): MessageData => ({
  id,
  text: "f",
  direction: "target",
})
const bwd = (id: string): MessageData => ({
  id,
  text: "b",
  direction: "source",
})

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

  // On a vertical edge, forward sits right and backward left — not swapped.
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

  it("stacks each group away from the line", () => {
    const msgs = [fwd("1"), bwd("2")]
    const h = computeMessageLayout(msgs, HORIZONTAL.src, HORIZONTAL.tgt, true)
    expect(h.forward.stackStep.y).toBeLessThan(0) // above → stacks up
    expect(h.backward.stackStep.y).toBeGreaterThan(0) // below → stacks down

    const v = computeMessageLayout(msgs, VERTICAL.src, VERTICAL.tgt, false)
    expect(v.forward.stackStep.y).toBeGreaterThan(0) // both sides stack down
    expect(v.backward.stackStep.y).toBeGreaterThan(0)
  })

  it.each<[boolean, IPoint, IPoint, number, number]>([
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
        src,
        tgt,
        isHorizontal
      )
      expect(forward.arrowRotation).toBe(fwdRot)
      expect(backward.arrowRotation).toBe(bwdRot)
    }
  )
})

describe("getMessageHostSegment", () => {
  it("hosts a straight vertical edge on the whole run, centered", () => {
    const host = getMessageHostSegment(
      [pt(100, 0), pt(100, 300)],
      pt(100, 0),
      pt(100, 300)
    )
    expect(host.isHorizontal).toBe(false)
    expect(host.point).toEqual({ x: 100, y: 150 })
  })

  it("ignores a short jog and hosts on a long arm (the reported bug)", () => {
    // The user's edge: two ~114px vertical arms joined by a 20px horizontal jog.
    // The naive mid-segment is the jog (→ horizontal, centered, crossing both
    // arms). The host must instead be a VERTICAL arm so labels sit beside it.
    const host = getMessageHostSegment(
      [pt(580, 509), pt(580, 395), pt(560, 395), pt(560, 281)],
      pt(580, 509),
      pt(560, 281)
    )
    expect(host.isHorizontal).toBe(false)
    expect([560, 580]).toContain(host.point.x)
    // Midpoint of a 114px vertical arm, never on the y=395 jog.
    expect(host.point.y).not.toBe(395)
  })

  it("breaks an equal-length tie toward the arm nearest the edge middle", () => {
    // Z-shape: 60 (H) + 100 (V) + 60 (H). The vertical arm is longest AND
    // central, so it wins outright; endpoints stay source->target order.
    const host = getMessageHostSegment(
      [pt(0, 0), pt(60, 0), pt(60, 100), pt(120, 100)],
      pt(0, 0),
      pt(120, 100)
    )
    expect(host.isHorizontal).toBe(false)
    expect(host.point).toEqual({ x: 60, y: 50 })
    expect(host.start).toEqual({ x: 60, y: 0 })
    expect(host.end).toEqual({ x: 60, y: 100 })
  })

  it("falls back to the endpoint midpoint when there is no polyline", () => {
    const host = getMessageHostSegment([], pt(0, 0), pt(40, 10))
    expect(host.point).toEqual({ x: 20, y: 5 })
    expect(host.isHorizontal).toBe(true)
  })
})
