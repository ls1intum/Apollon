import { describe, expect, it } from "vitest"
import type { DropElementConfig } from "@/constants"
import {
  buildPaletteNode,
  instantiatePaletteData,
  resolveTapPosition,
  snapToGrid,
} from "@/utils/paletteNode"

const config = {
  type: "Class",
  width: 160,
  height: 100,
  defaultData: {
    name: "Class",
    attributes: [{ id: "a1", name: "attr" }],
    methods: [{ id: "m1", name: "method()" }],
  },
} as unknown as DropElementConfig

describe("instantiatePaletteData", () => {
  it("re-mints ids on nested id-bearing children", () => {
    const data = instantiatePaletteData(config.defaultData)
    expect((data.attributes as { id: string }[])[0].id).not.toBe("a1")
    expect((data.methods as { id: string }[])[0].id).not.toBe("m1")
  })

  it("two instantiations never share child ids", () => {
    const a = instantiatePaletteData(config.defaultData)
    const b = instantiatePaletteData(config.defaultData)
    expect((a.methods as { id: string }[])[0].id).not.toBe(
      (b.methods as { id: string }[])[0].id
    )
  })

  it("deep-clones so the source config is never mutated", () => {
    const data = instantiatePaletteData(config.defaultData)
    ;(data.attributes as { name: string }[])[0].name = "changed"
    expect((config.defaultData!.attributes as { name: string }[])[0].name).toBe(
      "attr"
    )
  })

  it("tolerates missing defaultData", () => {
    expect(instantiatePaletteData(undefined)).toEqual({})
  })
})

describe("buildPaletteNode", () => {
  it("mints a fresh id and defaults to unselected", () => {
    const node = buildPaletteNode(config, { x: 10, y: 20 })
    expect(node.id).toBeTruthy()
    expect(node.selected).toBe(false)
    expect(node.type).toBe("Class")
    expect(node.position).toEqual({ x: 10, y: 20 })
  })

  it("uses drop size when it differs from the preview size", () => {
    const swimlane = {
      ...config,
      dropWidth: 400,
      dropHeight: 240,
    } as unknown as DropElementConfig
    const node = buildPaletteNode(swimlane, { x: 0, y: 0 })
    expect(node.width).toBe(400)
    expect(node.height).toBe(240)
    expect(node.measured).toEqual({ width: 400, height: 240 })
  })

  it("honours the selected + parentId options", () => {
    const node = buildPaletteNode(
      config,
      { x: 0, y: 0 },
      { parentId: "p1", selected: true }
    )
    expect(node.selected).toBe(true)
    expect(node.parentId).toBe("p1")
  })
})

describe("snapToGrid", () => {
  it("rounds to the nearest grid intersection", () => {
    expect(snapToGrid({ x: 12, y: 18 }, 5)).toEqual({ x: 10, y: 20 })
  })
  it("is a no-op for a non-positive step", () => {
    expect(snapToGrid({ x: 12, y: 18 }, 0)).toEqual({ x: 12, y: 18 })
  })
})

const visibleRect = { minX: 0, minY: 0, maxX: 1000, maxY: 800 }

const centered = { x: 420, y: 350 }

const resolve = (
  anchorAbsolute: { x: number; y: number } | null
): { x: number; y: number } =>
  resolveTapPosition({
    centeredPosition: centered,
    anchorAbsolute,
    nodeWidth: 160,
    nodeHeight: 100,
    visibleRect,
    stepPx: 20,
    snapPx: 5,
  })

describe("resolveTapPosition", () => {
  it("centres when there is no anchor", () => {
    expect(resolve(null)).toEqual(centered)
  })

  it("cascades one snapped step off a visible anchor", () => {
    // (102+20)=122 -> snaps to 120; (100+20)=120.
    expect(resolve({ x: 102, y: 100 })).toEqual({ x: 120, y: 120 })
  })

  it("falls back to centre when the cascaded node would land off screen", () => {
    expect(resolve({ x: 5000, y: 5000 })).toEqual(centered)
  })

  it("cascades when the resulting node only partially overlaps the viewport", () => {
    // Anchor+step top-left at (-15,-5): the node's right/bottom cross into view.
    expect(resolve({ x: -35, y: -25 })).toEqual({ x: -15, y: -5 })
  })
})
