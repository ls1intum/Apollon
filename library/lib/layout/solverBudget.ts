export type LayoutSolveBudget = Readonly<{
  maxExactEvaluations: number
  localSearchRounds: number
}>

/**
 * Exact evaluation runs Apollon's canonical router, so its budget must shrink
 * with diagram complexity. Placement seeds stay cheap; only the most diverse
 * seeds cross this boundary.
 */
export const getLayoutSolveBudget = (
  visibleNodeCount: number,
  visibleEdgeCount: number
): LayoutSolveBudget => {
  if (visibleNodeCount <= 24 && visibleEdgeCount <= 80)
    return { maxExactEvaluations: 6, localSearchRounds: 2 }
  if (visibleNodeCount <= 80 && visibleEdgeCount <= 240)
    return { maxExactEvaluations: 5, localSearchRounds: 1 }
  return { maxExactEvaluations: 2, localSearchRounds: 0 }
}
