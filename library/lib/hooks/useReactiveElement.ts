import { useStore } from "@xyflow/react"

/**
 * Reactive single-element reads for edit popovers. A popover must subscribe to
 * the edge/node it edits rather than reading getEdge/getNode imperatively
 * during render, so it re-renders on data changes — swap, a collaborator's
 * edit, re-selection. Without this the React Compiler memoizes the popover
 * render and its controls show stale values.
 */
export function useReactiveEdge(id: string) {
  return useStore((s) => s.edgeLookup.get(id))
}

export function useReactiveNode(id: string) {
  return useStore((s) => s.nodeLookup.get(id))
}

export function useReactiveNodeName(
  id: string | undefined,
  fallback: string
): string {
  return useStore(
    (s) => (id && (s.nodeLookup.get(id)?.data?.name as string)) || fallback
  )
}
