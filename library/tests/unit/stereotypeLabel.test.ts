import { describe, it, expect } from "vitest"
import { stereotypeLabel } from "@/utils/stereotypeLabel"
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
