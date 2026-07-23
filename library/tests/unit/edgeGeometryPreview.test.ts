import { describe, expect, it } from "vitest"
import type { Edge, Rect } from "@xyflow/react"
import {
  interpolateEdgeGeometrySettlement,
  prepareEdgeGeometrySettlement,
  projectRoutesWhileSolving,
  resolveReleasedEdgeGeometryPreview,
  stabilizeProvisionalRoutes,
} from "@/utils/geometry/edgeGeometryPreview"

const rect = (x: number, y: number, width = 100, height = 80): Rect => ({
  x,
  y,
  width,
  height,
})

const edge = {
  id: "e",
  source: "source",
  target: "target",
} as Edge

describe("pending edge-geometry projection", () => {
  it("requires two consecutive provisional generations before changing route decisions", () => {
    const displayed = [
      { x: 100, y: 40 },
      { x: 180, y: 40 },
      { x: 180, y: 60 },
      { x: 300, y: 60 },
    ]
    const candidate = [
      { x: 100, y: 40 },
      { x: 100, y: 100 },
      { x: 300, y: 100 },
      { x: 300, y: 60 },
    ]
    const pending = new Map<string, string>()
    const nodes = new Map([
      ["source", rect(0, 0)],
      ["target", rect(300, 0)],
    ])
    const input = {
      displayedById: { e: displayed },
      candidateById: { e: candidate },
      edges: [edge],
      nodes,
      pendingDecisionById: pending,
    }

    const held = stabilizeProvisionalRoutes(input)
    expect(held.routeById.e).toBe(displayed)
    expect(held.heldDecisionCount).toBe(1)
    expect(pending.size).toBe(1)
    const confirmed = stabilizeProvisionalRoutes(input)
    expect(confirmed.routeById.e).toBe(candidate)
    expect(confirmed.confirmedDecisionCount).toBe(1)
    expect(pending.size).toBe(0)
  })

  it("stabilizes port changes but accepts same-decision coordinate refinement", () => {
    const displayed = [
      { x: 100, y: 40 },
      { x: 180, y: 40 },
      { x: 180, y: 60 },
      { x: 300, y: 60 },
    ]
    const sameDecision = [
      { x: 100, y: 40 },
      { x: 220, y: 40 },
      { x: 220, y: 60 },
      { x: 300, y: 60 },
    ]
    const changedPorts = [
      { x: 100, y: 60 },
      { x: 220, y: 60 },
      { x: 220, y: 80 },
      { x: 300, y: 80 },
    ]
    const nodes = new Map([
      ["source", rect(0, 0)],
      ["target", rect(300, 0)],
    ])
    const pending = new Map<string, string>()

    expect(
      stabilizeProvisionalRoutes({
        displayedById: { e: displayed },
        candidateById: { e: sameDecision },
        edges: [edge],
        nodes,
        pendingDecisionById: pending,
      }).routeById.e
    ).toBe(sameDecision)
    expect(
      stabilizeProvisionalRoutes({
        displayedById: { e: sameDecision },
        candidateById: { e: changedPorts },
        edges: [edge],
        nodes,
        pendingDecisionById: pending,
      }).routeById.e
    ).toBe(sameDecision)
  })

  it("immediately replaces a held preview that now crosses another node", () => {
    const displayed = [
      { x: 100, y: 40 },
      { x: 300, y: 40 },
    ]
    const candidate = [
      { x: 100, y: 40 },
      { x: 100, y: 140 },
      { x: 300, y: 140 },
      { x: 300, y: 40 },
    ]
    const pending = new Map<string, string>()

    const replacement = stabilizeProvisionalRoutes({
      displayedById: { e: displayed },
      candidateById: { e: candidate },
      edges: [edge],
      nodes: new Map([
        ["source", rect(0, 0)],
        ["target", rect(300, 0)],
        ["obstacle", rect(170, 20, 60, 60)],
      ]),
      pendingDecisionById: pending,
    })
    expect(replacement.routeById.e).toBe(candidate)
    expect(replacement.invalidatedDecisionCount).toBe(1)
    expect(pending.size).toBe(0)
  })

  it("does not treat an endpoint container as an invalid preview obstacle", () => {
    const displayed = [
      { x: 100, y: 40 },
      { x: 300, y: 40 },
    ]
    const candidate = [
      { x: 100, y: 40 },
      { x: 100, y: 140 },
      { x: 300, y: 140 },
      { x: 300, y: 40 },
    ]
    const pending = new Map<string, string>()
    const containedEdge = {
      ...edge,
      source: "source",
      target: "target",
    }
    const stabilization = stabilizeProvisionalRoutes({
      displayedById: { e: displayed },
      candidateById: { e: candidate },
      edges: [containedEdge],
      nodes: new Map([
        ["container", { ...rect(-50, -50, 500, 300), type: "package" }],
        ["source", { ...rect(0, 0), parentId: "container" }],
        ["target", { ...rect(300, 0), parentId: "container" }],
      ]),
      pendingDecisionById: pending,
    })

    expect(stabilization.routeById.e).toBe(displayed)
    expect(stabilization.heldDecisionCount).toBe(1)
    expect(stabilization.invalidatedDecisionCount).toBe(0)
  })

  it("morphs different orthogonal topologies without drawing a diagonal", () => {
    const from = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ]
    const to = [
      { x: 0, y: 0 },
      { x: 0, y: 50 },
      { x: 150, y: 50 },
      { x: 150, y: 100 },
      { x: 200, y: 100 },
    ]
    const transition = prepareEdgeGeometrySettlement({ e: from }, { e: to })

    expect(interpolateEdgeGeometrySettlement(transition, 0).e).toBe(from)
    expect(interpolateEdgeGeometrySettlement(transition, 1).e).toBe(to)
    const halfway = interpolateEdgeGeometrySettlement(transition, 0.5).e
    expect(halfway).not.toEqual(from)
    expect(halfway).not.toEqual(to)
    for (let index = 1; index < halfway.length; index++)
      expect(
        halfway[index - 1].x === halfway[index].x ||
          halfway[index - 1].y === halfway[index].y
      ).toBe(true)
  })

  it("does not animate an already exact preview or a non-orthogonal route", () => {
    const exact = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]
    expect(
      prepareEdgeGeometrySettlement(
        { exact: exact.map((point) => ({ ...point })) },
        { exact }
      )
    ).toEqual({})
    expect(
      prepareEdgeGeometrySettlement(
        {
          diagonal: [
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ],
        },
        { diagonal: exact }
      )
    ).toEqual({})
  })

  it("keeps every interpolated segment orthogonal across topology combinations", () => {
    const route = (
      first: "horizontal" | "vertical",
      segmentCount: number,
      offset: number
    ) => {
      const points = [{ x: offset, y: offset }]
      for (let index = 0; index < segmentCount; index++) {
        const previous = points[points.length - 1]
        const horizontal = (first === "horizontal") === (index % 2 === 0)
        points.push(
          horizontal
            ? { x: previous.x + 20 + index, y: previous.y }
            : { x: previous.x, y: previous.y + 15 + index }
        )
      }
      return points
    }

    for (const fromFirst of ["horizontal", "vertical"] as const) {
      for (const toFirst of ["horizontal", "vertical"] as const) {
        for (let fromSegments = 1; fromSegments <= 8; fromSegments++) {
          for (let toSegments = 1; toSegments <= 8; toSegments++) {
            const transition = prepareEdgeGeometrySettlement(
              { e: route(fromFirst, fromSegments, 0) },
              { e: route(toFirst, toSegments, 7) }
            )
            for (const progress of [0.1, 0.25, 0.5, 0.75, 0.9]) {
              const interpolated = interpolateEdgeGeometrySettlement(
                transition,
                progress
              ).e
              for (let index = 1; index < interpolated.length; index++)
                expect(
                  interpolated[index - 1].x === interpolated[index].x ||
                    interpolated[index - 1].y === interpolated[index].y
                ).toBe(true)
            }
          }
        }
      }
    }
  })

  it("carries a committed customization preview across pointer release", () => {
    const preview = [
      { x: 100, y: 60 },
      { x: 300, y: 60 },
    ]
    const committed = { ...edge, data: { points: preview } }

    expect(
      resolveReleasedEdgeGeometryPreview(
        {
          edgeId: edge.id,
          originalEdge: edge,
          latestPoints: preview,
        },
        [committed],
        { [edge.id]: preview },
        {
          [edge.id]: [
            { x: 100, y: 40 },
            { x: 300, y: 40 },
          ],
        }
      )
    ).toEqual({ edgeId: edge.id, points: preview })
  })

  it("does not carry a cancelled or no-op gesture", () => {
    const preview = [
      { x: 100, y: 60 },
      { x: 300, y: 60 },
    ]

    expect(
      resolveReleasedEdgeGeometryPreview(
        {
          edgeId: edge.id,
          originalEdge: edge,
          latestPoints: preview,
        },
        [edge],
        { [edge.id]: preview },
        {}
      )
    ).toBeNull()
  })

  it("reuses exact route arrays when neither endpoint rectangle changed", () => {
    const movingRoute = [
      { x: 100, y: 40 },
      { x: 300, y: 40 },
    ]
    const stableRoute = [
      { x: 100, y: 240 },
      { x: 300, y: 240 },
    ]
    const stableEdge = {
      id: "stable",
      source: "stable-source",
      target: "stable-target",
    } as Edge
    const settled = new Map([
      ["source", rect(0, 0)],
      ["target", rect(300, 0)],
      ["stable-source", rect(0, 200)],
      ["stable-target", rect(300, 200)],
    ])
    const current = new Map([
      ["source", rect(40, 30)],
      ["target", rect(300, 0)],
      ["stable-source", rect(0, 200)],
      ["stable-target", rect(300, 200)],
    ])

    const projected = projectRoutesWhileSolving(
      { e: movingRoute, stable: stableRoute },
      [edge, stableEdge],
      settled,
      current
    )

    expect(projected.stable).toBe(stableRoute)
    expect(projected.e).not.toBe(movingRoute)
  })

  it("keeps a straight route attached and orthogonal while both nodes move", () => {
    const projected = projectRoutesWhileSolving(
      {
        e: [
          { x: 100, y: 40 },
          { x: 300, y: 40 },
        ],
      },
      [edge],
      new Map([
        ["source", rect(0, 0)],
        ["target", rect(300, 0)],
      ]),
      new Map([
        ["source", rect(40, 30)],
        ["target", rect(360, -20)],
      ])
    ).e

    expect(projected[0]).toEqual({ x: 140, y: 70 })
    expect(projected[projected.length - 1]).toEqual({ x: 360, y: 20 })
    expect(projected.length).toBe(4)
    for (let index = 1; index < projected.length; index++)
      expect(
        projected[index - 1].x === projected[index].x ||
          projected[index - 1].y === projected[index].y
      ).toBe(true)
  })

  it("preserves authored internal bends and terminal directions during resize", () => {
    const original = [
      { x: 100, y: 20 },
      { x: 150, y: 20 },
      { x: 150, y: 180 },
      { x: 300, y: 180 },
    ]
    const projected = projectRoutesWhileSolving(
      { e: original },
      [edge],
      new Map([
        ["source", rect(0, 0)],
        ["target", rect(300, 140)],
      ]),
      new Map([
        ["source", rect(20, 10, 200, 160)],
        ["target", rect(360, 120, 150, 120)],
      ])
    ).e

    expect(projected[0]).toEqual({ x: 220, y: 50 })
    expect(projected[projected.length - 1]).toEqual({ x: 360, y: 180 })
    expect(projected[1].y).toBe(projected[0].y)
    expect(projected[projected.length - 2].y).toBe(
      projected[projected.length - 1].y
    )
    for (let index = 1; index < projected.length; index++)
      expect(
        projected[index - 1].x === projected[index].x ||
          projected[index - 1].y === projected[index].y
      ).toBe(true)
  })
})
