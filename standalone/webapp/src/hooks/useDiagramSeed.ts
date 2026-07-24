import { useEffect, useState } from "react"
import { DiagramApiClient } from "@/services/DiagramApiClient"
import type { Diagram } from "@/types"

interface SeedState {
  diagram?: Diagram
  error?: unknown
  isPending: boolean
}

/** A settled load, tagged with the diagram it belongs to. */
interface SeedResult {
  diagramId: string
  diagram?: Diagram
  error?: unknown
}

/**
 * Loads the body `new ApollonEditor({ model })` mounts with, once per diagram.
 *
 * Deliberately NOT a TanStack Query. The editor seed is an initialisation
 * input, not server state: after mount, Yjs owns the document, so this value
 * must never be refetched, revalidated, or replayed from a cache on remount —
 * a re-joined room may have moved on. Everything a cache offers here has to be
 * switched off, and a query configured `staleTime: Infinity, gcTime: 0` is a
 * plain fetch wearing a cache's clothes. This is that plain fetch.
 *
 * Post-mount reads of the latest HEAD are separate, imperative, and owned by
 * their callers (see `ApollonShared`) — each with its own `AbortController`,
 * so one caller's teardown can never abort another's request.
 *
 * `isPending` is derived by comparing the settled result's diagram id against
 * the requested one, rather than stored: switching diagrams then reports
 * pending on the very first render, with no window in which the previous
 * diagram's body is still on offer.
 */
export function useDiagramSeed(
  diagramId: string | undefined,
  enabled: boolean
): SeedState {
  const [result, setResult] = useState<SeedResult | null>(null)
  const wanted = diagramId && enabled ? diagramId : undefined

  useEffect(() => {
    if (!wanted) return

    const abort = new AbortController()
    DiagramApiClient.fetchDiagram(wanted, { signal: abort.signal })
      .then((diagram) => {
        if (!abort.signal.aborted) setResult({ diagramId: wanted, diagram })
      })
      .catch((error: unknown) => {
        if (!abort.signal.aborted) setResult({ diagramId: wanted, error })
      })

    return () => abort.abort()
  }, [wanted])

  const settled = wanted !== undefined && result?.diagramId === wanted
  return {
    diagram: settled ? result.diagram : undefined,
    error: settled ? result.error : undefined,
    isPending: !settled,
  }
}
