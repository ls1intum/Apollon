import type { UMLModel } from "@tumaet/apollon"
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

describe("diagram template routing policy", () => {
  it.each(templates)(
    "%s deliberately leaves every edge under automatic routing",
    (_name, source) => {
      const model = source as unknown as UMLModel

      expect(model.edges).not.toHaveLength(0)
      expect(model.edges.map(getTemplateEdgeRoutingState)).toEqual(
        model.edges.map(() => "automatic")
      )
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
