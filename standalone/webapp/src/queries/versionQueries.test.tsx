import { afterEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import {
  setVersionRepository,
  RemoteVersionRepository,
  type VersionRepository,
} from "@/services/versionRepository"
import type { Diagram, VersionSummary } from "@/types"
import { createTestQueryClient } from "@/test/queryTestUtils"
import { useVersionBodyQuery, useVersionsQuery } from "./versionQueries"

const DIAGRAM_ID = "d1"

function summary(id: string, overrides: Partial<VersionSummary> = {}) {
  return {
    id,
    diagramId: DIAGRAM_ID,
    name: id,
    description: "",
    createdAt: "2026-04-29T12:00:00Z",
    kind: "user" as const,
    librarySchemaVersion: "4.0.0",
    ...overrides,
  }
}

function stubRepository(
  overrides: Partial<VersionRepository>
): VersionRepository {
  return {
    kind: "remote",
    cap: 50,
    list: vi.fn(async () => ({ versions: [], total: 0 })),
    getBody: vi.fn(
      async () => ({ nodes: [], edges: [] }) as unknown as Diagram
    ),
    create: vi.fn(),
    restore: vi.fn(),
    editInfo: vi.fn(),
    delete: vi.fn(),
    permalink: () => null,
    ...overrides,
  } as VersionRepository
}

function wrapperFor(client = createTestQueryClient()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

afterEach(() => {
  setVersionRepository(RemoteVersionRepository)
  vi.restoreAllMocks()
})

describe("useVersionsQuery", () => {
  it("pages through cursors and collapses hasNextPage when the server stops returning one", async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        versions: [summary("v3"), summary("v2")],
        nextCursor: "cursor-1",
        total: 3,
      })
      .mockResolvedValueOnce({
        versions: [summary("v1")],
        nextCursor: undefined,
        total: 3,
      })
    setVersionRepository(stubRepository({ list }))

    const { wrapper } = wrapperFor()
    const { result } = renderHook(() => useVersionsQuery(DIAGRAM_ID), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.versions.map((v) => v.id)).toEqual(["v3", "v2"])
    expect(result.current.data!.total).toBe(3)
    expect(result.current.hasNextPage).toBe(true)

    await result.current.fetchNextPage()
    await waitFor(() =>
      expect(result.current.data!.versions.map((v) => v.id)).toEqual([
        "v3",
        "v2",
        "v1",
      ])
    )
    expect(result.current.hasNextPage).toBe(false)
    // The cursor of the previous page was forwarded to the repository.
    expect(list).toHaveBeenLastCalledWith(
      DIAGRAM_ID,
      expect.objectContaining({ before: "cursor-1" })
    )
  })
})

describe("useVersionBodyQuery", () => {
  it("does not fetch while disabled; flipping enabled fires exactly one request", async () => {
    const getBody = vi.fn(
      async () => ({ nodes: [], edges: [] }) as unknown as Diagram
    )
    setVersionRepository(stubRepository({ getBody }))

    const { wrapper } = wrapperFor()
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useVersionBodyQuery(DIAGRAM_ID, "v1", { enabled }),
      { wrapper, initialProps: { enabled: false } }
    )

    // Off-screen: the visibility gate keeps the request from ever starting.
    await new Promise((r) => setTimeout(r, 10))
    expect(getBody).not.toHaveBeenCalled()

    rerender({ enabled: true })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getBody).toHaveBeenCalledTimes(1)

    // A second consumer of the same body is served from the cache
    // (staleTime: Infinity — snapshots are immutable).
    const second = renderHook(
      () => useVersionBodyQuery(DIAGRAM_ID, "v1", { enabled: true }),
      { wrapper }
    )
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true))
    expect(getBody).toHaveBeenCalledTimes(1)
  })
})
