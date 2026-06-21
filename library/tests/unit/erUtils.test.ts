import { describe, expect, it } from "vitest"
import {
  classifyErConnection,
  getConnectionLineType,
  getDefaultEdgeType,
  getEdgeMarkerStyles,
} from "@/utils"
import { ConnectionLineType } from "@xyflow/react"

describe("classifyErConnection", () => {
  it("treats entity ↔ relationship as a cardinality connector (both directions)", () => {
    expect(classifyErConnection("erEntity", "erRelationship")).toEqual({
      valid: true,
      edgeType: "ErConnector",
    })
    expect(classifyErConnection("erRelationship", "erEntity")).toEqual({
      valid: true,
      edgeType: "ErConnector",
    })
  })

  it("treats anything touching an attribute as a plain link", () => {
    expect(classifyErConnection("erEntity", "erAttribute")).toEqual({
      valid: true,
      edgeType: "ErLink",
    })
    expect(classifyErConnection("erRelationship", "erAttribute")).toEqual({
      valid: true,
      edgeType: "ErLink",
    })
    // composite attribute → child attribute
    expect(classifyErConnection("erAttribute", "erAttribute")).toEqual({
      valid: true,
      edgeType: "ErLink",
    })
  })

  it("rejects entity ↔ entity and relationship ↔ relationship", () => {
    expect(classifyErConnection("erEntity", "erEntity")).toEqual({
      valid: false,
    })
    expect(classifyErConnection("erRelationship", "erRelationship")).toEqual({
      valid: false,
    })
  })

  it("rejects connections that involve a non-ER node or undefined endpoints", () => {
    expect(classifyErConnection("erEntity", "class")).toEqual({ valid: false })
    expect(classifyErConnection(undefined, "erEntity")).toEqual({
      valid: false,
    })
  })
})

describe("ER edge type / connection-line wiring", () => {
  it("defaults a new ER edge to the cardinality connector", () => {
    expect(getDefaultEdgeType("EntityRelationship")).toBe("ErConnector")
  })

  it("uses straight connection lines for ER diagrams", () => {
    expect(getConnectionLineType("EntityRelationship")).toBe(
      ConnectionLineType.Straight
    )
  })

  it("renders ER connectors and links as plain, marker-less lines", () => {
    for (const type of ["ErConnector", "ErLink"]) {
      const styles = getEdgeMarkerStyles(type)
      expect(styles.markerEnd).toBeUndefined()
      expect(styles.markerStart).toBeUndefined()
      expect(styles.strokeDashArray).toBe("0")
    }
  })
})
