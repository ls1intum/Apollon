import { describe, it, expect } from "vitest"
import type { UMLModel } from "@tumaet/apollon"
import { findUnsupportedLabels } from "../services/glyph-coverage.js"

const model = (
  nodes: unknown[],
  edges: unknown[] = [],
  title = "t"
): UMLModel =>
  ({
    version: "4.0.0",
    id: "d",
    title,
    type: "ClassDiagram",
    nodes,
    edges,
    assessments: {},
  }) as UMLModel

describe("findUnsupportedLabels", () => {
  it("passes the scripts the bundled Inter covers: Latin, Greek, Cyrillic, Vietnamese", () => {
    const m = model(
      [
        { data: { name: "Größenänderung", attributes: ["+ id: Long"] } },
        { data: { name: "λ-Reduktion (Σ, α, β)" } }, // Greek
        { data: { name: "Заказ (Україна)" } }, // Cyrillic
        { data: { name: "Phương thức" } }, // Vietnamese
      ],
      [{ data: { messages: [{ text: "1: «create» — done…" }] } }]
    )
    expect(findUnsupportedLabels(m)).toEqual([])
  })

  it("flags CJK, emoji, Arabic, and Hebrew (genuinely outside Inter)", () => {
    expect(
      findUnsupportedLabels(model([{ data: { name: "注文" } }]))
    ).toContain("注文")
    expect(
      findUnsupportedLabels(model([{ data: { name: "الطلب" } }]))
    ).toContain("الطلب")
    expect(
      findUnsupportedLabels(model([{ data: { name: "הזמנה" } }]))
    ).toContain("הזמנה")
    expect(
      findUnsupportedLabels(
        model([], [{ data: { messages: [{ text: "ship 🚀" }] } }])
      )
    ).toContain("ship 🚀")
  })

  it("flags a CJK diagram title", () => {
    expect(findUnsupportedLabels(model([], [], "クラス図"))).toContain(
      "クラス図"
    )
  })

  it("does not flag non-string model internals (points, numbers)", () => {
    const m = model(
      [{ data: { name: "Order", x: 10, y: 20 } }],
      [{ data: { points: [{ x: 1, y: 2 }] } }]
    )
    expect(findUnsupportedLabels(m)).toEqual([])
  })
})
