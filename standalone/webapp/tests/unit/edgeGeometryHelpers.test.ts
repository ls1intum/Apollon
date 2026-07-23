import { describe, expect, it } from "vitest"
import { collapseCollinearVertices } from "../helpers/edgeGeometry"

describe("collapseCollinearVertices", () => {
  it("does not count line-jump decoration as a route bend", () => {
    expect(
      collapseCollinearVertices([
        { x: 0, y: 10 },
        { x: 40, y: 10 },
        { x: 60, y: 10 },
        { x: 100, y: 10 },
      ])
    ).toEqual([
      { x: 0, y: 10 },
      { x: 100, y: 10 },
    ])
  })

  it("preserves real bends and is direction-independent", () => {
    const route = [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 40 },
      { x: 80, y: 40 },
    ]
    expect(collapseCollinearVertices(route)).toEqual(route)
    expect(collapseCollinearVertices([...route].reverse())).toEqual(
      [...route].reverse()
    )
  })
})
