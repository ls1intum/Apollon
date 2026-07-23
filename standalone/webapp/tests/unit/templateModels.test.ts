import { importDiagram, type UMLModel } from "@tumaet/apollon"
import adapter from "../../assets/diagramTemplates/Adapter.json"
import bridge from "../../assets/diagramTemplates/Bridge.json"
import command from "../../assets/diagramTemplates/Command.json"
import factory from "../../assets/diagramTemplates/Factory.json"
import observer from "../../assets/diagramTemplates/Observer.json"
import { describe, expect, it } from "vitest"
import {
  getTemplateEdgeRoutingState,
  prepareTemplateModel,
} from "../../src/utils/templateModels"

const templates = [
  ["Adapter", adapter],
  ["Bridge", bridge],
  ["Command", command],
  ["Factory", factory],
  ["Observer", observer],
] as const

const routingPolicies = [
  ["Adapter", adapter, { automatic: 1, pinned: 2, authored: 0 }],
  ["Bridge", bridge, { automatic: 2, pinned: 4, authored: 0 }],
  ["Command", command, { automatic: 5, pinned: 1, authored: 0 }],
  ["Factory", factory, { automatic: 1, pinned: 3, authored: 0 }],
  ["Observer", observer, { automatic: 1, pinned: 2, authored: 0 }],
] as const

describe("diagram template routing policy", () => {
  it.each(templates)(
    "%s is directly importable as a valid Apollon diagram",
    (_, source) => {
      const model = importDiagram(structuredClone(source))

      expect(model.edges.every((edge) => edge.data != null)).toBe(true)
    }
  )

  it.each(routingPolicies)(
    "%s keeps associations automatic and pins only canonical hierarchy seats",
    (_name, source, expected) => {
      const model = source as unknown as UMLModel
      const states = model.edges.map(getTemplateEdgeRoutingState)

      expect(model.edges).not.toHaveLength(0)
      expect({
        automatic: states.filter((state) => state === "automatic").length,
        pinned: states.filter((state) => state === "pinned").length,
        authored: states.filter((state) => state === "authored").length,
      }).toEqual(expected)
      expect(
        model.edges
          .filter((edge) => getTemplateEdgeRoutingState(edge) === "pinned")
          .every(
            (edge) =>
              edge.type === "ClassInheritance" &&
              edge.data?.points?.length === 0
          )
      ).toBe(true)
    }
  )

  it.each(templates)(
    "%s spaces pinned hierarchy seats into equal side segments",
    (_, source) => {
      const model = source as unknown as UMLModel
      const groups = new Map<string, number[]>()

      for (const edge of model.edges) {
        if (getTemplateEdgeRoutingState(edge) !== "pinned") continue

        expect(edge.type).toBe("ClassInheritance")
        expect(edge.data?.sourceAnchor).toEqual({
          side: "top",
          ratio: 0.5,
        })
        expect(edge.data?.targetAnchor?.side).toBe("bottom")

        const key = `${edge.target}:${edge.data.targetAnchor.side}`
        const ratios = groups.get(key) ?? []
        ratios.push(edge.data.targetAnchor.ratio)
        groups.set(key, ratios)
      }

      for (const ratios of groups.values()) {
        ratios.sort((a, b) => a - b)
        expect(ratios).toEqual(
          ratios.map((_, index) => (index + 1) / (ratios.length + 1))
        )
      }
    }
  )

  it.each(templates)(
    "%s is connected and has valid edge endpoints",
    (_, source) => {
      const model = source as unknown as UMLModel
      const nodeIds = new Set(model.nodes.map((node) => node.id))

      expect(new Set(model.nodes.map((node) => node.id)).size).toBe(
        model.nodes.length
      )
      expect(new Set(model.edges.map((edge) => edge.id)).size).toBe(
        model.edges.length
      )
      expect(
        model.edges.every(
          (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
        )
      ).toBe(true)

      const reached = new Set<string>([model.nodes[0].id])
      for (let previousSize = -1; reached.size !== previousSize; ) {
        previousSize = reached.size
        for (const edge of model.edges) {
          if (reached.has(edge.source)) reached.add(edge.target)
          if (reached.has(edge.target)) reached.add(edge.source)
        }
      }
      expect(reached.size).toBe(model.nodes.length)
    }
  )

  it.each(templates)(
    "%s creates a clean model without mutating its bundled source",
    (name, source) => {
      const sourceSnapshot = JSON.stringify(source)
      const model = prepareTemplateModel(source as unknown as UMLModel, {
        id: `created-${name.toLowerCase()}`,
        title: name,
      })

      expect(model.id).toBe(`created-${name.toLowerCase()}`)
      expect(model.title).toBe(name)
      expect(model.nodes).not.toHaveLength(0)
      expect(model.edges).not.toHaveLength(0)
      expect(
        model.nodes.some(
          (node) =>
            "selected" in node || "dragging" in node || "resizing" in node
        )
      ).toBe(false)
      expect(model.edges.some((edge) => "selected" in edge)).toBe(false)
      expect(model.edges.every((edge) => Array.isArray(edge.data.points))).toBe(
        true
      )
      expect(JSON.stringify(source)).toBe(sourceSnapshot)
    }
  )

  it("preserves intentional endpoint pins and authored bends", () => {
    const source = structuredClone(adapter) as unknown as UMLModel
    source.edges[0].data = {
      points: [],
      sourceAnchor: { side: "right", ratio: 0.25 },
    }
    source.edges[1].data = {
      points: [
        { x: 120, y: 330 },
        { x: 120, y: 250 },
        { x: 365, y: 250 },
        { x: 365, y: 190 },
      ],
    }

    const model = prepareTemplateModel(source)

    expect(getTemplateEdgeRoutingState(model.edges[0])).toBe("pinned")
    expect(model.edges[0].data.sourceAnchor).toEqual({
      side: "right",
      ratio: 0.25,
    })
    expect(getTemplateEdgeRoutingState(model.edges[1])).toBe("authored")
    expect(model.edges[1].data.points).toEqual(source.edges[1].data.points)
  })
})
