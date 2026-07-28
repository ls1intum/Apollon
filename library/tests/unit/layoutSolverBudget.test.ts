import { describe, expect, it } from "vitest"
import { shortlistPlacementCandidates } from "@/layout/candidateSolver"
import { getLayoutSolveBudget } from "@/layout/solverBudget"
import type { DiagramPlacementCandidate } from "@/layout/placementGenerator"

const candidate = (id: string): DiagramPlacementCandidate => ({
  id,
  direction: id.startsWith("right") ? "RIGHT" : "DOWN",
  positions: {},
  layers: [],
})

describe("diagram layout solve budgets", () => {
  it("reserves progressively fewer exact routes as diagrams grow", () => {
    expect(getLayoutSolveBudget(24, 80)).toEqual({
      maxExactEvaluations: 6,
      localSearchRounds: 2,
    })
    expect(getLayoutSolveBudget(80, 240)).toEqual({
      maxExactEvaluations: 5,
      localSearchRounds: 1,
    })
    expect(getLayoutSolveBudget(81, 240)).toEqual({
      maxExactEvaluations: 2,
      localSearchRounds: 0,
    })
  })

  it("keeps axis and structural diversity when exact routing is constrained", () => {
    const candidates = [
      candidate("down-stable"),
      candidate("down-current"),
      candidate("right-stable"),
      candidate("right-current"),
      candidate("radial-structures"),
    ]

    expect(
      shortlistPlacementCandidates(candidates, 3).map(({ id }) => id)
    ).toEqual(["down-stable", "right-stable", "radial-structures"])
    expect(
      shortlistPlacementCandidates(candidates, 2).map(({ id }) => id)
    ).toEqual(["down-stable", "radial-structures"])
    expect(
      shortlistPlacementCandidates(candidates.slice(0, 4), 1).map(
        ({ id }) => id
      )
    ).toEqual(["down-current"])
  })
})
