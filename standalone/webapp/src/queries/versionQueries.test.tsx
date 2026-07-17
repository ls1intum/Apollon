import { afterEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import type { VersionRepository } from "@/services/versionRepository"
import { stubVersionRepository } from "@/test/versionRepositoryStub"
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

function wrapperFor(client = createTestQueryClient()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

let restoreRepository: () => void = () => {}
let restoreRemote: () => void = () => {}
let restoreLocal: () => void = () => {}

function useStubRepository(overrides: Partial<VersionRepository>) {
  restoreRepository = stubVersionRepository("remote", overrides)
}

afterEach(() => {
  restoreRepository()
  restoreRemote()
  restoreLocal()
  restoreRepository = () => {}
  restoreRemote = () => {}
  restoreLocal = () => {}
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
    useStubRepository({ list })

    const { wrapper } = wrapperFor()
    const { result } = renderHook(
      () => useVersionsQuery("remote", DIAGRAM_ID),
      {
        wrapper,
      }
    )

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

describe("versionListQueryOptions", () => {
  it("keys and resolves by backend kind, so local and remote never share a cache", async () => {
    const remoteList = vi.fn(async () => ({
      versions: [summary("r1")],
      total: 1,
    }))
    const localList = vi.fn(async () => ({
      versions: [summary("l1")],
      total: 1,
    }))
    restoreRemote = stubVersionRepository("remote", { list: remoteList })
    restoreLocal = stubVersionRepository("local", { list: localList })

    const { wrapper } = wrapperFor()
    const remote = renderHook(() => useVersionsQuery("remote", DIAGRAM_ID), {
      wrapper,
    })
    const local = renderHook(() => useVersionsQuery("local", DIAGRAM_ID), {
      wrapper,
    })

    await waitFor(() => expect(remote.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(local.result.current.isSuccess).toBe(true))

    // Same diagram id, different backend: each hit its own adapter and got its
    // own rows rather than one serving the other from cache.
    expect(remote.result.current.data!.versions.map((v) => v.id)).toEqual([
      "r1",
    ])
    expect(local.result.current.data!.versions.map((v) => v.id)).toEqual(["l1"])
    expect(remoteList).toHaveBeenCalledTimes(1)
    expect(localList).toHaveBeenCalledTimes(1)
  })
})

describe("useVersionBodyQuery", () => {
  it("serves every consumer of a version body from one fetch", async () => {
    // `staleTime: Infinity` is the contract: a snapshot is immutable, so the
    // thumbnail, preview entry and dirty-check baseline must share one request.
    const getBody = vi.fn(
      async () => ({ nodes: [], edges: [] }) as unknown as Diagram
    )
    useStubRepository({ getBody })

    const { wrapper } = wrapperFor()
    const first = renderHook(
      () => useVersionBodyQuery("remote", DIAGRAM_ID, "v1"),
      { wrapper }
    )
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true))

    const second = renderHook(
      () => useVersionBodyQuery("remote", DIAGRAM_ID, "v1"),
      { wrapper }
    )
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true))

    expect(getBody).toHaveBeenCalledTimes(1)
  })
})
