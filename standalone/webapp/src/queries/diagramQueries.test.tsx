import { afterEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { DiagramApiClient } from "@/services/DiagramApiClient"
import type { Diagram } from "@/types"
import { createTestQueryClient } from "@/test/queryTestUtils"
import { diagramKeys } from "./keys"
import { fetchFreshDiagram, useDiagramSeedQuery } from "./diagramQueries"

const DIAGRAM_ID = "d1"
const body = { id: DIAGRAM_ID, nodes: [], edges: [] } as unknown as Diagram

function setup() {
  const client = createTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

afterEach(() => vi.restoreAllMocks())

describe("useDiagramSeedQuery", () => {
  it("fetches once and forwards the abort signal to the API client", async () => {
    const fetchDiagram = vi
      .spyOn(DiagramApiClient, "fetchDiagram")
      .mockResolvedValue(body)
    const { wrapper } = setup()
    const { result } = renderHook(() => useDiagramSeedQuery(DIAGRAM_ID), {
      wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(body)
    expect(fetchDiagram).toHaveBeenCalledTimes(1)
    expect(fetchDiagram).toHaveBeenCalledWith(DIAGRAM_ID, {
      signal: expect.any(AbortSignal),
    })
  })

  it("drops the cache entry on unmount (gcTime: 0) so a re-join re-fetches", async () => {
    vi.spyOn(DiagramApiClient, "fetchDiagram").mockResolvedValue(body)
    const { client, wrapper } = setup()
    // The seed contract overrides the test default with its own gcTime: 0.
    const { result, unmount } = renderHook(
      () => useDiagramSeedQuery(DIAGRAM_ID),
      { wrapper }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.getQueryData(diagramKeys.seed(DIAGRAM_ID))).toBe(body)

    unmount()
    await waitFor(() =>
      expect(
        client.getQueryCache().find({ queryKey: diagramKeys.seed(DIAGRAM_ID) })
      ).toBeUndefined()
    )
  })
})

describe("fetchFreshDiagram", () => {
  it("always hits the network on its own key — a cached seed must never satisfy it", async () => {
    const fetchDiagram = vi
      .spyOn(DiagramApiClient, "fetchDiagram")
      .mockResolvedValue(body)
    const { client, wrapper } = setup()

    // Warm the seed…
    const { result } = renderHook(() => useDiagramSeedQuery(DIAGRAM_ID), {
      wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchDiagram).toHaveBeenCalledTimes(1)

    // …then request the latest HEAD: a second network call, not a cache hit.
    // (If the head fetch shared the seed's key + staleTime: Infinity, this
    // would be served stale and peers would see outdated restores.)
    await fetchFreshDiagram(client, DIAGRAM_ID, "peer-restore")
    expect(fetchDiagram).toHaveBeenCalledTimes(2)

    // And again — staleTime: 0 on the head key means every call re-fetches.
    await fetchFreshDiagram(client, DIAGRAM_ID, "peer-restore")
    expect(fetchDiagram).toHaveBeenCalledTimes(3)
  })

  it("gives each reason its own cancellation scope", async () => {
    // The preview effect cancels its reload on every preview change, while the
    // WebSocket handler's peer-restore refresh lives for the page's lifetime.
    // Sharing one key would let the former abort the latter mid-flight —
    // silently dropping a collaborator's restore after we already toasted it.
    const signals = new Map<string, AbortSignal>()
    vi.spyOn(DiagramApiClient, "fetchDiagram").mockImplementation(
      (id, opts) =>
        new Promise<Diagram>(() => {
          // Never settles: the point is which signal gets aborted.
          signals.set(id, opts!.signal!)
        })
    )
    const { client } = setup()

    // Swallow the CancelledError the teardown assertion below provokes —
    // production callers do the same via `isQueryCancellation`.
    fetchFreshDiagram(client, DIAGRAM_ID, "peer-restore").catch(() => {})
    await waitFor(() => expect(signals.get(DIAGRAM_ID)).toBeDefined())
    const peerSignal = signals.get(DIAGRAM_ID)!

    // The preview effect's cleanup must not touch the peer refresh.
    await client.cancelQueries({
      queryKey: diagramKeys.head(DIAGRAM_ID, "preview-exit"),
    })
    expect(peerSignal.aborted).toBe(false)

    // The page teardown key cancels every reason at once.
    await client.cancelQueries({ queryKey: diagramKeys.heads(DIAGRAM_ID) })
    expect(peerSignal.aborted).toBe(true)
  })
})
