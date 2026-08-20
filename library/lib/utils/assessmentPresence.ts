import type { ApollonNode, Assessment } from "@/typings"

/** An assessment says something only if it carries a score or a comment. */
export function isGraded(assessment: Assessment | undefined): boolean {
  return (
    assessment !== undefined &&
    (assessment.score !== undefined || !!assessment.feedback)
  )
}

/**
 * Every id whose assessment is shown when `elementId` is opened: the element
 * itself plus its members, because a class popover lists its attributes and
 * methods alongside the class.
 *
 * This is why "does this element have feedback?" cannot be answered from the
 * element's own assessment. A class is frequently ungraded itself while two of
 * its methods carry all the feedback — treating that class as empty hides the
 * only way to reach those methods, since a member is not separately clickable
 * on the canvas.
 */
export function assessedIdsFor(
  elementId: string,
  nodes: readonly Pick<ApollonNode, "id" | "data">[]
): string[] {
  const node = nodes.find((candidate) => candidate.id === elementId)
  if (!node) return [elementId]

  const ids = [elementId]
  const data = (node.data ?? {}) as Record<string, unknown>
  for (const [key, value] of Object.entries(data)) {
    // `tags` is a payload, not a member list — the same exclusion tagUtils makes.
    if (key === "tags" || !Array.isArray(value)) continue
    for (const item of value) {
      if (item && typeof item === "object" && typeof item.id === "string") {
        ids.push(item.id)
      }
    }
  }
  return ids
}

/** Whether opening `elementId` would show at least one graded box. */
export function hasAssessmentToShow(
  elementId: string,
  nodes: readonly Pick<ApollonNode, "id" | "data">[],
  getAssessment: (id: string) => Assessment | undefined
): boolean {
  return assessedIdsFor(elementId, nodes).some((id) =>
    isGraded(getAssessment(id))
  )
}
