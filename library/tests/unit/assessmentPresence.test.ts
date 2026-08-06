import { describe, expect, it } from "vitest"
import {
  assessedIdsFor,
  hasAssessmentToShow,
  isGraded,
} from "@/utils/assessmentPresence"
import type { ApollonNode, Assessment } from "@/typings"

/**
 * "Does this element have feedback?" cannot be answered from its own assessment.
 * A class popover lists the class AND its attributes and methods, and a member
 * is not separately clickable on the canvas — so a class that is itself ungraded
 * is still the only route to feedback on its methods. Treating it as empty hides
 * that feedback entirely, which is exactly what happened.
 */
const nodes = [
  {
    id: "class-1",
    data: {
      name: "Order",
      attributes: [{ id: "attr-1", name: "+ id: int" }],
      methods: [{ id: "method-1", name: "+ total()" }],
      tags: ["not-a-member"],
    },
  },
  { id: "class-2", data: { name: "Empty", attributes: [], methods: [] } },
] as unknown as Pick<ApollonNode, "id" | "data">[]

const store = (entries: Record<string, Assessment>) => (id: string) =>
  entries[id]

describe("isGraded", () => {
  it("counts a score or a comment, and nothing else", () => {
    expect(isGraded(undefined)).toBe(false)
    expect(isGraded({} as Assessment)).toBe(false)
    expect(isGraded({ score: 0 } as Assessment)).toBe(true)
    expect(isGraded({ score: -2 } as Assessment)).toBe(true)
    expect(isGraded({ feedback: "see slide 4" } as Assessment)).toBe(true)
    expect(isGraded({ feedback: "" } as Assessment)).toBe(false)
  })
})

describe("assessedIdsFor", () => {
  it("collects the element and every member the popover lists", () => {
    expect(assessedIdsFor("class-1", nodes)).toEqual([
      "class-1",
      "attr-1",
      "method-1",
    ])
  })

  it("never treats tags as members", () => {
    expect(assessedIdsFor("class-1", nodes)).not.toContain("not-a-member")
  })

  it("falls back to the id alone for an edge or an unknown element", () => {
    expect(assessedIdsFor("edge-1", nodes)).toEqual(["edge-1"])
  })
})

describe("hasAssessmentToShow", () => {
  it("is true for a class graded only through a method", () => {
    const getAssessment = store({
      "method-1": { score: 2 } as Assessment,
    })
    expect(hasAssessmentToShow("class-1", nodes, getAssessment)).toBe(true)
  })

  it("is true for a class graded on itself", () => {
    const getAssessment = store({ "class-1": { score: 1 } as Assessment })
    expect(hasAssessmentToShow("class-1", nodes, getAssessment)).toBe(true)
  })

  it("is false when neither the class nor any member says anything", () => {
    expect(hasAssessmentToShow("class-1", nodes, store({}))).toBe(false)
    expect(
      hasAssessmentToShow(
        "class-1",
        nodes,
        store({ "class-1": {} as Assessment })
      )
    ).toBe(false)
  })

  it("handles a member-less element", () => {
    expect(
      hasAssessmentToShow(
        "class-2",
        nodes,
        store({ "class-2": { score: 0 } as Assessment })
      )
    ).toBe(true)
    expect(hasAssessmentToShow("class-2", nodes, store({}))).toBe(false)
  })
})
