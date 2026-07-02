import { describe, it, expect } from "vitest"
import { stereotypeLabel, withAbstractMarker } from "@/utils/stereotypeLabel"
import { ClassStereotype } from "@/types/nodes/enums"

describe("stereotypeLabel", () => {
  it("wraps a keyword in guillemets", () => {
    expect(stereotypeLabel("interface")).toBe("«interface»")
  })

  it("renders the ClassStereotype keywords in their lowercase UML spelling", () => {
    expect(stereotypeLabel(ClassStereotype.Interface)).toBe("«interface»")
    expect(stereotypeLabel(ClassStereotype.Enumeration)).toBe("«enumeration»")
  })

  it("passes a component/deployment stereotype through as authored", () => {
    expect(stereotypeLabel("component")).toBe("«component»")
  })
})

describe("withAbstractMarker", () => {
  it("appends the UML {abstract} annotation when abstract", () => {
    expect(withAbstractMarker("Shape", true)).toBe("Shape {abstract}")
    expect(withAbstractMarker("+ draw(): void", true)).toBe(
      "+ draw(): void {abstract}"
    )
  })

  it("leaves the name untouched when not abstract", () => {
    expect(withAbstractMarker("Shape", false)).toBe("Shape")
    expect(withAbstractMarker("Shape")).toBe("Shape")
    expect(withAbstractMarker("Shape", undefined)).toBe("Shape")
  })
})
