import type { Edge, Node } from "@xyflow/react"
import type { EdgeGeometryStore } from "@/store/edgeGeometryStore"
import type { IPoint } from "@/edges/Connection"
import { getPositionOnCanvas } from "@/utils/nodeUtils"
import { getStraightMidSegment } from "@/utils/geometry/edgeLabelLayout"

/** Marks the one element whose feedback popover is open. */
export const ASSESSMENT_FOCUS_CLASS = "apollon-assessment-focus"

/** Canvas anchor shared by assessment badges, host reveals and footer navigation. */
export const getAssessmentElementCenter = (
  element: Node | Edge,
  nodes: Node[],
  routes: Pick<EdgeGeometryStore, "geometryById" | "previewById">
): IPoint | undefined => {
  if ("source" in element) {
    const route =
      routes.previewById[element.id] ?? routes.geometryById[element.id]
    if (route?.length > 1)
      return getStraightMidSegment(route, route[0], route[route.length - 1])
        .point
  }

  const nodeIds =
    "source" in element ? [element.source, element.target] : [element.id]
  const anchors = nodeIds
    .map((id) => nodes.find((node) => node.id === id))
    .filter((node): node is Node => node !== undefined)
  if (anchors.length === 0) return undefined

  const sum = anchors.reduce(
    (center, node) => {
      const position = getPositionOnCanvas(node, nodes)
      return {
        x: center.x + position.x + (node.width ?? 0) / 2,
        y: center.y + position.y + (node.height ?? 0) / 2,
      }
    },
    { x: 0, y: 0 }
  )
  return { x: sum.x / anchors.length, y: sum.y / anchors.length }
}

/**
 * Adds {@link ASSESSMENT_FOCUS_CLASS} to whichever element the open feedback
 * popover belongs to.
 *
 * Assessment cannot lean on React Flow's `selected` for this. Selection is a
 * canvas-editing concept that the next pane click, the popover taking focus, or
 * a host re-render is free to drop — but the element being assessed has to stay
 * legible for as long as its form is open, so the tutor can see what they are
 * grading. The popover's own element id is the authoritative answer, and it is
 * already the single source of truth for which form is mounted.
 *
 * Returns the input array unchanged (by reference) when nothing is focused, so
 * ordinary modelling re-renders nothing.
 */
export function applyAssessmentFocus<
  T extends { id: string; className?: string },
>(elements: T[], focusedId: string | null): T[] {
  if (!focusedId) return elements
  if (!elements.some((element) => element.id === focusedId)) return elements
  return elements.map((element) =>
    element.id === focusedId
      ? {
          ...element,
          className: [element.className, ASSESSMENT_FOCUS_CLASS]
            .filter(Boolean)
            .join(" "),
        }
      : element
  )
}
