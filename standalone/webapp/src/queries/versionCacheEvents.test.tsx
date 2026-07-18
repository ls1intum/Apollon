import { afterEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import type { ControlEvent, VersionSummary } from "@/types"
import { stubVersionRepository } from "@/test/versionRepositoryStub"
import { createTestQueryClient } from "@/test/queryTestUtils"
import { log } from "@/logger"
import { versionKeys } from "./keys"
import { useVersionsQuery } from "./versionQueries"
import { applyControlEventToCache } from "./versionCacheEvents"

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

let restoreRepository: () => void = () => {}

/**
 * Mounts the list query the way the drawer does, so each event is judged by
 * what a reader of the list ends up seeing — not by which cache method fired.
 */
function setup(serverRows: VersionSummary[], afterEvent = serverRows) {
  const page = (versions: VersionSummary[]) => ({
    versions,
    nextCursor: undefined,
    total: versions.length,
  })
  // First read is what the drawer mounted with; any later read is the server
  // state the event is telling us about.
  const list = vi
    .fn()
    .mockResolvedValueOnce(page(serverRows))
    .mockResolvedValue(page(afterEvent))
  restoreRepository = stubVersionRepository("remote", { list })

  const client = createTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const view = renderHook(() => useVersionsQuery("remote", DIAGRAM_ID), {
    wrapper,
  })
  return { client, list, view }
}

const rowIds = (view: ReturnType<typeof setup>["view"]) =>
  view.result.current.data?.versions.map((v) => v.id)

afterEach(() => {
  restoreRepository()
  restoreRepository = () => {}
  vi.restoreAllMocks()
})

describe("applyControlEventToCache", () => {
  it("shows a version a peer created", async () => {
    const { client, view } = setup(
      [summary("existing")],
      [summary("brand-new"), summary("existing")]
    )
    await waitFor(() => expect(rowIds(view)).toEqual(["existing"]))

    applyControlEventToCache(client, DIAGRAM_ID, {
      type: "VERSION_CREATED",
      versionId: "brand-new",
      createdAt: "2026-04-30T10:00:00Z",
      name: "remote-save",
      kind: "auto",
    })

    await waitFor(() => expect(rowIds(view)).toEqual(["brand-new", "existing"]))
  })

  it("does not re-read the list for a version it already has", async () => {
    // The creating client's own echo: its create already refreshed the list.
    const { client, list, view } = setup([summary("a")])
    await waitFor(() => expect(rowIds(view)).toEqual(["a"]))
    expect(list).toHaveBeenCalledTimes(1)

    applyControlEventToCache(client, DIAGRAM_ID, {
      type: "VERSION_CREATED",
      versionId: "a",
      createdAt: "2026-04-29T12:00:00Z",
      name: "a",
      kind: "user",
    })

    await new Promise((r) => setTimeout(r, 10))
    expect(list).toHaveBeenCalledTimes(1)
  })

  it("drops a version a peer deleted, and its body", async () => {
    const { client, view } = setup([summary("a"), summary("b")])
    await waitFor(() => expect(rowIds(view)).toEqual(["a", "b"]))
    client.setQueryData(versionKeys.body("remote", DIAGRAM_ID, "a"), {
      nodes: [],
    })

    applyControlEventToCache(client, DIAGRAM_ID, {
      type: "VERSION_DELETED",
      versionId: "a",
    })

    await waitFor(() => expect(rowIds(view)).toEqual(["b"]))
    // The body of a deleted version can never be shown again.
    expect(
      client.getQueryData(versionKeys.body("remote", DIAGRAM_ID, "a"))
    ).toBeUndefined()
  })

  it("relabels a version a peer renamed", async () => {
    const { client, view } = setup([summary("a", { name: "old" })])
    await waitFor(() => expect(rowIds(view)).toEqual(["a"]))

    applyControlEventToCache(client, DIAGRAM_ID, {
      type: "VERSION_RENAMED",
      versionId: "a",
      name: "renamed",
      description: "with body",
    })

    await waitFor(() => {
      const row = view.result.current.data!.versions[0]!
      expect(row.name).toBe("renamed")
      expect(row.description).toBe("with body")
    })
  })

  it("picks up the auto-snapshot a peer's restore created", async () => {
    const { client, view } = setup(
      [summary("a")],
      [summary("auto-snap"), summary("a")]
    )
    await waitFor(() => expect(rowIds(view)).toEqual(["a"]))

    applyControlEventToCache(client, DIAGRAM_ID, {
      type: "VERSION_RESTORED",
      headRev: 5,
      updatedAt: "2026-05-08T12:00:00Z",
      autoSnapshotVersionId: "auto-snap",
      restoredFromVersionId: "v3",
    })

    await waitFor(() => expect(rowIds(view)).toEqual(["auto-snap", "a"]))
  })

  it("logs and ignores an event type from a newer server (staggered rollout)", async () => {
    const { client, view } = setup([summary("a")])
    await waitFor(() => expect(rowIds(view)).toEqual(["a"]))
    const warn = vi.spyOn(log, "warn").mockImplementation(() => {})

    applyControlEventToCache(client, DIAGRAM_ID, {
      type: "VERSION_FROM_THE_FUTURE",
    } as unknown as ControlEvent)

    expect(warn).toHaveBeenCalledWith(
      expect.anything(),
      "VERSION_FROM_THE_FUTURE"
    )
    expect(rowIds(view)).toEqual(["a"])
  })
})
