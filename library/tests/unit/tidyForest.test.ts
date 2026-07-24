import { describe, expect, it } from "vitest"
import type { Node, Edge } from "@xyflow/react"
import { buildSyntaxTreeForest } from "@/utils/tidyTree/buildForest"
import { computeTidyLayout } from "@/utils/tidyTree/applyTidyLayout"

const stNode = (
  id: string,
  x: number,
  y: number,
  extra: Partial<Node> = {}
): Node => ({
  id,
  type: "syntaxTreeNonterminal",
  position: { x, y },
  data: {},
  measured: { width: 60, height: 40 },
  ...extra,
})

const link = (source: string, target: string): Edge => ({
  id: `${source}->${target}`,
  source,
  target,
  type: "SyntaxTreeLink",
})

const idSet = (nodes: Node[]): Set<string> => new Set(nodes.map((n) => n.id))

describe("buildSyntaxTreeForest", () => {
  it("lays out every clean root of a three-tree forest, dropping nothing", () => {
    const nodes = [
      stNode("r1", 0, 0),
      stNode("r1c", 0, 100),
      stNode("r2", 300, 0),
      stNode("r2c", 300, 100),
      stNode("r3", 600, 0),
      stNode("r3c", 600, 100),
    ]
    const edges = [link("r1", "r1c"), link("r2", "r2c"), link("r3", "r3c")]
    const forest = buildSyntaxTreeForest(nodes, edges)

    expect(forest.roots.sort()).toEqual(["r1", "r2", "r3"])
    expect(forest.laidOut.size).toBe(6)
    expect(forest.skipped.size).toBe(0)
  })

  it("skips a multi-parent node and its whole subtree, leaving them unchanged", () => {
    const nodes = [
      stNode("p1", 0, 0),
      stNode("p2", 200, 0),
      stNode("c", 100, 100),
      stNode("gc", 100, 200),
    ]
    const edges = [link("p1", "c"), link("p2", "c"), link("c", "gc")]
    const forest = buildSyntaxTreeForest(nodes, edges)

    expect(forest.skipped.has("c")).toBe(true)
    expect(forest.skipped.has("gc")).toBe(true)
    expect(forest.laidOut.has("c")).toBe(false)
    expect(forest.laidOut.has("gc")).toBe(false)

    const out = computeTidyLayout(nodes, edges)
    const byId = new Map(out.map((n) => [n.id, n]))
    // Skipped nodes keep their exact object (position untouched).
    expect(byId.get("c")).toBe(nodes[2])
    expect(byId.get("gc")).toBe(nodes[3])
  })

  it("skips a directed cycle and returns its nodes by reference", () => {
    const nodes = [stNode("a", 0, 0), stNode("b", 100, 0), stNode("c", 200, 0)]
    const edges = [link("a", "b"), link("b", "c"), link("c", "a")]
    const forest = buildSyntaxTreeForest(nodes, edges)

    expect(forest.roots).toEqual([])
    expect(forest.laidOut.size).toBe(0)
    expect(forest.skipped).toEqual(new Set(["a", "b", "c"]))

    const out = computeTidyLayout(nodes, edges)
    out.forEach((n, i) => expect(n).toBe(nodes[i]))
  })

  it("ignores non-syntax nodes and non-syntax edges entirely", () => {
    const nodes = [
      stNode("r", 0, 0),
      stNode("rc", 0, 100),
      { ...stNode("box", 500, 500), type: "package" } as Node,
      { ...stNode("cls", 700, 700), type: "class" } as Node,
    ]
    const edges = [
      link("r", "rc"),
      { id: "assoc", source: "box", target: "cls", type: "ClassLink" } as Edge,
    ]
    const forest = buildSyntaxTreeForest(nodes, edges)

    expect(forest.laidOut).toEqual(new Set(["r", "rc"]))
    expect(forest.skipped.size).toBe(0)

    const out = computeTidyLayout(nodes, edges)
    const byId = new Map(out.map((n) => [n.id, n]))
    // The non-syntax nodes are returned untouched, by reference.
    expect(byId.get("box")).toBe(nodes[2])
    expect(byId.get("cls")).toBe(nodes[3])
  })
})

describe("computeTidyLayout", () => {
  it("preserves the node count and id set", () => {
    const nodes = [
      stNode("r", 0, 0),
      stNode("a", -50, 100),
      stNode("b", 50, 100),
      { ...stNode("other", 900, 900), type: "package" } as Node,
    ]
    const edges = [link("r", "a"), link("r", "b")]
    const out = computeTidyLayout(nodes, edges)

    expect(out.length).toBe(nodes.length)
    expect(idSet(out)).toEqual(idSet(nodes))
  })

  it("keeps the root pinned and writes container-relative child positions", () => {
    const container = {
      id: "container",
      type: "package",
      position: { x: 500, y: 400 },
      data: {},
      measured: { width: 400, height: 400 },
    } as Node
    const nodes = [
      container,
      stNode("root", 10, 10, { parentId: "container" }),
      stNode("child", 200, 10, { parentId: "container" }),
    ]
    const edges = [link("root", "child")]
    const out = computeTidyLayout(nodes, edges)
    const byId = new Map(out.map((n) => [n.id, n]))

    // Root does not move (returned by reference).
    expect(byId.get("root")).toBe(nodes[1])
    // Child sits one level below the root: canvas y = rootCanvasY + h + levelGap
    // = 410 + 40 + 60 = 510, minus the container origin (400) => 110 relative.
    // Centred under the equal-width root: canvas x = 510, minus 500 => 10.
    expect(byId.get("child")!.position).toEqual({ x: 10, y: 110 })
  })

  it("marks a cross-container link's deeper node as skipped", () => {
    const container = {
      id: "container",
      type: "package",
      position: { x: 500, y: 500 },
      data: {},
      measured: { width: 300, height: 300 },
    } as Node
    const nodes = [
      container,
      stNode("outer", 0, 0),
      stNode("inner", 10, 10, { parentId: "container" }),
    ]
    const edges = [link("outer", "inner")]
    const forest = buildSyntaxTreeForest(nodes, edges)

    expect(forest.skipped.has("inner")).toBe(true)
    expect(forest.laidOut.has("inner")).toBe(false)
  })

  it("is idempotent: re-laying-out a tidy tree returns nodes by reference", () => {
    const nodes = [
      stNode("r", 0, 0),
      stNode("a", -80, 100),
      stNode("b", 80, 100),
      stNode("a1", -120, 200),
      stNode("a2", -40, 200),
    ]
    const edges = [
      link("r", "a"),
      link("r", "b"),
      link("a", "a1"),
      link("a", "a2"),
    ]
    const first = computeTidyLayout(nodes, edges)
    const second = computeTidyLayout(first, edges)

    // A second pass over an already-tidy tree moves nothing.
    second.forEach((n, i) => expect(n).toBe(first[i]))
    for (let i = 0; i < first.length; i++) {
      expect(second[i].position).toEqual(first[i].position)
    }
  })
})
