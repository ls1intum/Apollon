import { describe, it, expect } from "vitest"
import { buildServerRenderHandles } from "@/nodes/handles/serverRenderHandles"

const ids = (handles: { id: string }[]) => [
  ...new Set(handles.map((h) => h.id)),
]

describe("buildServerRenderHandles", () => {
  it("emits source+target variants for each handle", () => {
    const handles = buildServerRenderHandles({
      nodeType: "class",
      width: 200,
      height: 100,
    })
    const center = handles.filter((h) => h.id === "t:0.500")
    expect(center.map((h) => h.type).sort()).toEqual(["source", "target"])
  })

  it("emits centre + quarters on long sides and never the corners", () => {
    const got = ids(
      buildServerRenderHandles({
        nodeType: "class",
        width: 200, // long side → quarters
        height: 60, // short side → centre only
      })
    )
    // top (long): quarters + centre, NO corners (ratio 0/1)
    expect(got).toEqual(
      expect.arrayContaining(["t:0.250", "t:0.500", "t:0.750"])
    )
    expect(got).not.toContain("t:0.000")
    expect(got).not.toContain("t:1.000")
    // left (short): centre only
    expect(got).toContain("l:0.500")
    expect(got).not.toContain("l:0.250")
  })

  it("backs every referenced anchor id so SSR edges never drop", () => {
    const handles = buildServerRenderHandles({
      nodeType: "class",
      width: 200,
      height: 100,
      anchorIds: ["r:0.350", "l:0.650"],
    })
    const got = ids(handles)
    expect(got).toContain("r:0.350")
    expect(got).toContain("l:0.650")
  })

  it("center-variant nodes only expose the four side centres", () => {
    const handles = buildServerRenderHandles({
      nodeType: "bpmnGateway",
      width: 60,
      height: 60,
    })
    expect(ids(handles).sort()).toEqual([
      "b:0.500",
      "l:0.500",
      "r:0.500",
      "t:0.500",
    ])
  })

  it("returns nothing for non-connectable nodes", () => {
    expect(
      buildServerRenderHandles({
        nodeType: "colorDescription",
        width: 200,
        height: 100,
      })
    ).toEqual([])
  })
})
