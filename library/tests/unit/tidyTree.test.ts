import { describe, expect, it } from "vitest"
import {
  layoutTidyTree,
  type TidyNodeInput,
  type TidyOptions,
  type TidyPosition,
} from "@/utils/tidyTree/tidyTree"

const OPTS: TidyOptions = {
  siblingGap: 30,
  subtreeGap: 20,
  levelGap: 60,
  gridSnap: 5,
}

/** Build a `nodesById` map from a flat list of node specs. */
const toMap = (
  specs: ReadonlyArray<TidyNodeInput>
): Map<string, TidyNodeInput> => {
  const map = new Map<string, TidyNodeInput>()
  for (const spec of specs) map.set(spec.id, spec)
  return map
}

const node = (
  id: string,
  width: number,
  height: number,
  childIds: string[] = []
): TidyNodeInput => ({ id, width, height, childIds })

const centerX = (pos: TidyPosition, spec: TidyNodeInput): number =>
  pos.x + spec.width / 2

const requiredSeparation = (
  left: TidyNodeInput,
  right: TidyNodeInput
): number => left.width / 2 + OPTS.siblingGap + right.width / 2

describe("layoutTidyTree", () => {
  it("places a single node at the normalised origin", () => {
    const specs = [node("a", 160, 100)]
    const layout = layoutTidyTree(["a"], toMap(specs), OPTS)
    expect(layout.get("a")).toEqual({ x: 0, y: 0 })
  })

  it("lays out a balanced binary tree symmetrically with no sibling overlap", () => {
    const specs = [
      node("r", 60, 40, ["l", "rr"]),
      node("l", 60, 40, ["ll", "lr"]),
      node("rr", 60, 40, ["rl", "rrr"]),
      node("ll", 60, 40),
      node("lr", 60, 40),
      node("rl", 60, 40),
      node("rrr", 60, 40),
    ]
    const map = toMap(specs)
    const layout = layoutTidyTree(["r"], map, OPTS)

    const c = (id: string) => centerX(layout.get(id)!, map.get(id)!)

    // Depth 1 siblings clear the required separation.
    expect(c("rr") - c("l")).toBeGreaterThanOrEqual(
      requiredSeparation(map.get("l")!, map.get("rr")!)
    )
    // Depth 2 sibling pairs likewise.
    expect(c("lr") - c("ll")).toBeGreaterThanOrEqual(
      requiredSeparation(map.get("ll")!, map.get("lr")!)
    )
    expect(c("rrr") - c("rl")).toBeGreaterThanOrEqual(
      requiredSeparation(map.get("rl")!, map.get("rrr")!)
    )

    // Symmetry: the tree is a mirror image about the root's centre.
    const root = c("r")
    expect(c("rr") - root).toBeCloseTo(root - c("l"), 6)
    expect(c("rl") - root).toBeCloseTo(root - c("lr"), 6)
    expect(c("rrr") - root).toBeCloseTo(root - c("ll"), 6)
  })

  it("centres an n-ary parent over its children", () => {
    const specs = [
      node("p", 60, 40, ["a", "b", "c", "d"]),
      node("a", 60, 40),
      node("b", 60, 40),
      node("c", 60, 40),
      node("d", 60, 40),
    ]
    const map = toMap(specs)
    const layout = layoutTidyTree(["p"], map, OPTS)
    const c = (id: string) => centerX(layout.get(id)!, map.get(id)!)

    const childrenMidpoint = (c("a") + c("d")) / 2
    expect(Math.abs(c("p") - childrenMidpoint)).toBeLessThanOrEqual(
      OPTS.gridSnap
    )

    // Children are evenly spaced and non-overlapping.
    for (const [left, right] of [
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
    ] as const) {
      expect(c(right) - c(left)).toBeGreaterThanOrEqual(
        requiredSeparation(map.get(left)!, map.get(right)!)
      )
    }
  })

  it("pushes siblings apart around a wide-label child (#282 guard)", () => {
    const specs = [
      node("p", 60, 40, ["a", "wide", "c"]),
      node("a", 60, 40),
      node("wide", 400, 40),
      node("c", 60, 40),
    ]
    const map = toMap(specs)
    const layout = layoutTidyTree(["p"], map, OPTS)
    const c = (id: string) => centerX(layout.get(id)!, map.get(id)!)

    // No bounding-box overlap on either side of the wide child.
    expect(c("wide") - c("a")).toBeGreaterThanOrEqual(
      map.get("a")!.width / 2 + map.get("wide")!.width / 2
    )
    expect(c("c") - c("wide")).toBeGreaterThanOrEqual(
      map.get("wide")!.width / 2 + map.get("c")!.width / 2
    )
    // And the full separation clearance is honoured.
    expect(c("wide") - c("a")).toBeGreaterThanOrEqual(
      requiredSeparation(map.get("a")!, map.get("wide")!)
    )
    expect(c("c") - c("wide")).toBeGreaterThanOrEqual(
      requiredSeparation(map.get("wide")!, map.get("c")!)
    )
  })

  it("stacks a deep skewed chain with no cross-level overlap", () => {
    const specs = [
      node("n0", 60, 40, ["n1"]),
      node("n1", 60, 40, ["n2"]),
      node("n2", 60, 40, ["n3"]),
      node("n3", 60, 40, ["n4"]),
      node("n4", 60, 40),
    ]
    const map = toMap(specs)
    const layout = layoutTidyTree(["n0"], map, OPTS)

    for (let d = 1; d <= 4; d++) {
      const parent = layout.get(`n${d - 1}`)!
      const child = layout.get(`n${d}`)!
      expect(child.y - parent.y).toBeGreaterThanOrEqual(
        map.get(`n${d - 1}`)!.height + OPTS.levelGap
      )
    }
  })

  it("is deterministic and produces integer, grid-snapped coordinates", () => {
    const specs = [
      node("r", 90, 50, ["a", "b"]),
      node("a", 70, 40, ["a1", "a2", "a3"]),
      node("b", 120, 40, ["b1"]),
      node("a1", 60, 40),
      node("a2", 60, 40),
      node("a3", 60, 40),
      node("b1", 200, 40),
    ]
    const map = toMap(specs)
    const first = layoutTidyTree(["r"], map, OPTS)
    const second = layoutTidyTree(["r"], map, OPTS)

    expect([...second.entries()].sort()).toEqual([...first.entries()].sort())

    for (const pos of first.values()) {
      expect(Number.isInteger(pos.x)).toBe(true)
      expect(Number.isInteger(pos.y)).toBe(true)
      expect(pos.x % OPTS.gridSnap).toBe(0)
      expect(pos.y % OPTS.gridSnap).toBe(0)
    }
  })

  it("normalises a forest so the minimum x and y are 0", () => {
    const specs = [
      node("r1", 60, 40, ["r1a"]),
      node("r1a", 60, 40),
      node("r2", 60, 40),
    ]
    const layout = layoutTidyTree(["r1", "r2"], toMap(specs), OPTS)
    const minX = Math.min(...[...layout.values()].map((p) => p.x))
    const minY = Math.min(...[...layout.values()].map((p) => p.y))
    expect(minX).toBe(0)
    expect(minY).toBe(0)
  })
})
