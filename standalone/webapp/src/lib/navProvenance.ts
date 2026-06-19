/** Where an in-app navigation originated, so a chrome page can offer a real "back". */
export type NavFrom = string

/**
 * Canonical labels for the back affordances, shared by the editor navbar and the
 * chrome back affordance (BackNav/useBackTarget) so the same action can never be
 * spelled two different ways in those entry points. The error pages render the
 * literal as a default prop value.
 */
export const ALL_DIAGRAMS_LABEL = "All diagrams"
export const BACK_TO_DIAGRAM_LABEL = "Back to diagram"

/**
 * Whether a stamped provenance path is one we will actually send the user back
 * to. Restricted to routes whose editor state is restored purely from the local
 * store, so a plain <Link> back is lossless:
 *   - /local/:id and /playground read from the persistence store.
 *   - /shared/:id is intentionally excluded — it re-fetches over the network and
 *     can re-prompt for a collaboration name, so returning is not lossless; it
 *     falls back to the dashboard instead.
 * A positive allowlist (not a bare leading-slash check) also blocks open-redirect
 * via a crafted state value such as "/\evil.com".
 */
export const isRestorableEditorPath = (
  from: string | undefined | null
): from is string =>
  typeof from === "string" &&
  (/^\/local\/[^/]+/.test(from) || /^\/playground(\?|$)/.test(from))

/** Read the stamped origin out of opaque router location state, if present. */
export const readNavFrom = (state: unknown): NavFrom | undefined => {
  const from = (state as { from?: unknown } | null)?.from
  return typeof from === "string" ? from : undefined
}

/** Read the home-gallery highlight hint out of opaque router location state. */
export const readHighlightSharedDiagramId = (
  state: unknown
): string | undefined => {
  const id = (state as { highlightSharedDiagramId?: unknown } | null)
    ?.highlightSharedDiagramId
  return typeof id === "string" ? id : undefined
}
