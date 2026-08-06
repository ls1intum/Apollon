/** Marks the one element whose feedback popover is open. */
export const ASSESSMENT_FOCUS_CLASS = "apollon-assessment-focus"

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
