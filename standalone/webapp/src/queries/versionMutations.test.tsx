import { afterEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { toast } from "react-toastify"
import type { VersionRepository } from "@/services/versionRepository"
import { stubVersionRepository } from "@/test/versionRepositoryStub"
import { useVersionStore } from "@/stores/useVersionStore"
import type { UMLModel } from "@tumaet/apollon"
import type { VersionSummary } from "@/types"
import { createTestQueryClient } from "@/test/queryTestUtils"
import { versionKeys } from "./keys"
import { useVersionsQuery, type VersionListData } from "./versionQueries"
import {
  useCreateVersionMutation,
  useDeleteVersionMutation,
  useEditVersionInfoMutation,
  useRestoreVersionMutation,
} from "./versionMutations"

const DIAGRAM_ID = "d1"
const LIST_KEY = versionKeys.list("remote", DIAGRAM_ID)
const fakeBody = { nodes: [], edges: [] } as unknown as UMLModel

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

function seed(versions: VersionSummary[]): VersionListData {
  return {
    pages: [{ versions, nextCursor: undefined, total: versions.length }],
    pageParams: [undefined],
  }
}

let restoreRepository: () => void = () => {}

function setup(repoOverrides: Partial<VersionRepository>) {
  restoreRepository = stubVersionRepository("remote", repoOverrides)
  const client = createTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

function cachedRows(client: ReturnType<typeof createTestQueryClient>) {
  return client
    .getQueryData<VersionListData>(LIST_KEY)!
    .pages.flatMap((p) => p.versions)
}

afterEach(() => {
  restoreRepository()
  restoreRepository = () => {}
  useVersionStore.setState({
    preview: null,
    undoRestore: null,
    pendingRestoreFromId: null,
  })
  vi.restoreAllMocks()
})

describe("useEditVersionInfoMutation", () => {
  it("shows the new description before the server confirms it", async () => {
    let resolveEdit!: (v: VersionSummary) => void
    const editInfo = vi.fn(
      () => new Promise<VersionSummary>((resolve) => (resolveEdit = resolve))
    )
    const { client, wrapper } = setup({ editInfo })
    client.setQueryData(LIST_KEY, seed([summary("v1"), summary("v2")]))

    const { result } = renderHook(
      () => useEditVersionInfoMutation("remote", DIAGRAM_ID),
      { wrapper }
    )
    const pending = result.current.mutateAsync({
      versionId: "v1",
      patch: { description: "optimistic" },
    })

    // Mid-flight: the row already reads back the user's text.
    await waitFor(() =>
      expect(cachedRows(client).find((v) => v.id === "v1")!.description).toBe(
        "optimistic"
      )
    )
    expect(cachedRows(client).find((v) => v.id === "v2")!.description).toBe("")

    resolveEdit(summary("v1", { description: "server-desc" }))
    await pending
    expect(cachedRows(client).find((v) => v.id === "v1")!.description).toBe(
      "server-desc"
    )
  })

  it("survives a list refetch that was already in flight", async () => {
    // `onMutate` must cancel in-flight reads first: a refetch that started
    // before the edit resolves with pre-edit rows and would otherwise land on
    // top of the optimistic patch, reverting the row under the user.
    let resolveStaleRefetch!: (v: {
      versions: VersionSummary[]
      total: number
    }) => void
    const list = vi
      .fn()
      .mockResolvedValueOnce({ versions: [summary("v1")], total: 1 })
      .mockImplementationOnce(
        () =>
          new Promise<{ versions: VersionSummary[]; total: number }>(
            (resolve) => (resolveStaleRefetch = resolve)
          )
      )
      // The settle-time invalidation reads the committed row.
      .mockResolvedValue({
        versions: [summary("v1", { description: "optimistic" })],
        total: 1,
      })
    const editInfo = vi
      .fn()
      .mockResolvedValue(summary("v1", { description: "optimistic" }))
    const { client, wrapper } = setup({ editInfo, list })

    const view = renderHook(() => useVersionsQuery("remote", DIAGRAM_ID), {
      wrapper,
    })
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true))

    // A refetch is in flight (focus, or a peer's control event)…
    void client.invalidateQueries({ queryKey: LIST_KEY })
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))

    // …when the user edits the description.
    const { result } = renderHook(
      () => useEditVersionInfoMutation("remote", DIAGRAM_ID),
      { wrapper }
    )
    const pending = result.current.mutateAsync({
      versionId: "v1",
      patch: { description: "optimistic" },
    })
    const shownDescription = () =>
      view.result.current.data?.versions.find((v) => v.id === "v1")?.description
    await waitFor(() => expect(shownDescription()).toBe("optimistic"))

    // The stale read lands late and must be discarded, not applied.
    resolveStaleRefetch({ versions: [summary("v1")], total: 1 })
    await pending

    expect(shownDescription()).toBe("optimistic")
  })

  it("rolls back the optimistic patch when the PATCH fails", async () => {
    const editInfo = vi.fn().mockRejectedValue(new Error("forbidden"))
    const { client, wrapper } = setup({ editInfo })
    client.setQueryData(
      LIST_KEY,
      seed([summary("v1", { name: "before", description: "before-desc" })])
    )

    const { result } = renderHook(
      () => useEditVersionInfoMutation("remote", DIAGRAM_ID),
      { wrapper }
    )
    await expect(
      result.current.mutateAsync({
        versionId: "v1",
        patch: { name: "after", description: "after-desc" },
      })
    ).rejects.toThrow(/forbidden/)

    const row = cachedRows(client).find((v) => v.id === "v1")!
    expect(row.name).toBe("before")
    expect(row.description).toBe("before-desc")
  })
})

describe("useDeleteVersionMutation", () => {
  it("removes the row optimistically and reinstates it when the DELETE fails", async () => {
    const del = vi.fn().mockRejectedValue(new Error("conflict"))
    const { client, wrapper } = setup({ delete: del })
    client.setQueryData(
      LIST_KEY,
      seed([summary("a"), summary("b"), summary("c")])
    )

    const { result } = renderHook(
      () => useDeleteVersionMutation("remote", DIAGRAM_ID),
      {
        wrapper,
      }
    )
    await expect(
      result.current.mutateAsync({ versionId: "b" })
    ).rejects.toThrow(/conflict/)

    expect(cachedRows(client).map((v) => v.id)).toEqual(["a", "b", "c"])
  })

  it("drops the cached body of a successfully deleted version", async () => {
    const del = vi.fn().mockResolvedValue(undefined)
    const { client, wrapper } = setup({ delete: del })
    client.setQueryData(LIST_KEY, seed([summary("a")]))
    client.setQueryData(versionKeys.body("remote", DIAGRAM_ID, "a"), fakeBody)

    const { result } = renderHook(
      () => useDeleteVersionMutation("remote", DIAGRAM_ID),
      {
        wrapper,
      }
    )
    await result.current.mutateAsync({ versionId: "a" })

    expect(cachedRows(client)).toEqual([])
    expect(
      client.getQueryData(versionKeys.body("remote", DIAGRAM_ID, "a"))
    ).toBeUndefined()
  })
})

describe("useRestoreVersionMutation", () => {
  it("raises pendingRestoreFromId BEFORE the request settles (WS self-detection window)", async () => {
    let resolveRestore!: (v: {
      updatedAt: string
      autoSnapshotVersionId: string
      headRev?: number
    }) => void
    const restore = vi.fn(
      () =>
        new Promise<{
          updatedAt: string
          autoSnapshotVersionId: string
          headRev?: number
        }>((resolve) => {
          resolveRestore = resolve
        })
    )
    const { client, wrapper } = setup({ restore })
    client.setQueryData(
      LIST_KEY,
      seed([summary("v42", { description: "Milestone" })])
    )

    const { result } = renderHook(
      () => useRestoreVersionMutation("remote", DIAGRAM_ID),
      {
        wrapper,
      }
    )
    const pending = result.current.mutateAsync({
      versionId: "v42",
      currentBody: fakeBody,
    })

    // The flag is up while the request is in flight — this is the window in
    // which the WS VERSION_RESTORED event must be classified as self-caused.
    await waitFor(() =>
      expect(useVersionStore.getState().pendingRestoreFromId).toBe("v42")
    )

    resolveRestore({
      updatedAt: "2026-05-08T12:00:00Z",
      autoSnapshotVersionId: "auto-1",
      headRev: 7,
    })
    await pending

    const state = useVersionStore.getState()
    expect(state.pendingRestoreFromId).toBeNull()
    expect(state.undoRestore).toMatchObject({
      diagramId: DIAGRAM_ID,
      autoSnapshotVersionId: "auto-1",
      restoredFromVersionId: "v42",
      // Resolved from the cached list (description wins).
      restoredVersionName: "Milestone",
    })
  })

  it("clears the pending flag when the restore fails", async () => {
    const restore = vi.fn().mockRejectedValue(new Error("boom"))
    const { wrapper } = setup({ restore })

    const { result } = renderHook(
      () => useRestoreVersionMutation("remote", DIAGRAM_ID),
      {
        wrapper,
      }
    )
    await expect(
      result.current.mutateAsync({ versionId: "v1", currentBody: fakeBody })
    ).rejects.toThrow(/boom/)
    expect(useVersionStore.getState().pendingRestoreFromId).toBeNull()
    expect(useVersionStore.getState().undoRestore).toBeNull()
  })
})

describe("useCreateVersionMutation", () => {
  it("surfaces named evictions with the backend's cap and invalidates the list", async () => {
    const create = vi.fn().mockResolvedValue({
      ...summary("new-version"),
      evictedVersionIds: ["old-1"],
      evictedKinds: ["named"],
      cap: 30,
    })
    const { wrapper } = setup({ create })
    const warning = vi.spyOn(toast, "warning")

    const { result } = renderHook(
      () => useCreateVersionMutation("remote", DIAGRAM_ID),
      { wrapper }
    )
    await result.current.mutateAsync({ body: fakeBody, name: "n" })

    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining("30-version cap"),
      expect.anything()
    )
  })

  it("reports an autosave-only eviction as information, not data loss", async () => {
    const create = vi.fn().mockResolvedValue({
      ...summary("new-version"),
      evictedVersionIds: ["old-1"],
      evictedKinds: ["unnamed"],
      cap: 30,
    })
    const { wrapper } = setup({ create })
    const info = vi.spyOn(toast, "info")
    const warning = vi.spyOn(toast, "warning")

    const { result } = renderHook(
      () => useCreateVersionMutation("remote", DIAGRAM_ID),
      { wrapper }
    )
    await result.current.mutateAsync({ body: fakeBody })

    expect(info).toHaveBeenCalledWith(
      expect.stringContaining("older autosave was removed"),
      expect.anything()
    )
    expect(warning).not.toHaveBeenCalled()
  })

  it("re-reads the list even when the create fails, so a half-commit reconciles", async () => {
    const create = vi.fn().mockRejectedValue(new Error("network"))
    const list = vi.fn(async () => ({ versions: [summary("a")], total: 1 }))
    const { wrapper } = setup({ create, list })
    // An observed list is what a refetch acts on.
    renderHook(() => useVersionsQuery("remote", DIAGRAM_ID), { wrapper })
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1))

    const { result } = renderHook(
      () => useCreateVersionMutation("remote", DIAGRAM_ID),
      { wrapper }
    )
    await expect(
      result.current.mutateAsync({ body: fakeBody })
    ).rejects.toThrow(/network/)

    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  })

  it("stays pending until the refreshed list has landed", async () => {
    // The drawer derives its optimistic row from `isPending` alone, which is
    // only gapless because `onSettled` RETURNS the invalidation promise.
    let resolveList!: (v: { versions: VersionSummary[]; total: number }) => void
    const list = vi
      .fn()
      .mockResolvedValueOnce({ versions: [], total: 0 })
      .mockImplementationOnce(
        () =>
          new Promise<{ versions: VersionSummary[]; total: number }>(
            (resolve) => (resolveList = resolve)
          )
      )
    const create = vi.fn().mockResolvedValue(summary("new-version"))
    const { wrapper } = setup({ create, list })
    renderHook(() => useVersionsQuery("remote", DIAGRAM_ID), { wrapper })
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1))

    const { result } = renderHook(
      () => useCreateVersionMutation("remote", DIAGRAM_ID),
      { wrapper }
    )
    result.current.mutate({ body: fakeBody })

    // POST resolved, refetch still in flight → still pending.
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
    expect(create).toHaveBeenCalledTimes(1)
    expect(result.current.isPending).toBe(true)

    resolveList({ versions: [summary("new-version")], total: 1 })
    await waitFor(() => expect(result.current.isPending).toBe(false))
  })
})
