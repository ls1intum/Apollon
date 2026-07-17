import "fake-indexeddb/auto"
import { IDBFactory as FDBFactory } from "fake-indexeddb"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { QueryClient } from "@tanstack/react-query"
import {
  ensureVersionStoreBootstrapped,
  __teardownVersionStoreBootstrapForTests,
} from "./versionStoreBootstrap"
import { useVersionStore } from "./useVersionStore"
import { usePersistenceModelStore } from "./usePersistenceModelStore"
import { LocalVersionRepository } from "@/services/versionRepository"
import { __resetDbForTests } from "@/services/versionRepository/idb"
import { versionListQueryOptions } from "@/queries/versionQueries"
import { createTestQueryClient } from "@/test/queryTestUtils"

const DIAGRAM_ID = "boot-test-diagram"

let queryClient: QueryClient

beforeEach(async () => {
  Object.assign(globalThis, { indexedDB: new FDBFactory() })
  __resetDbForTests()
  __teardownVersionStoreBootstrapForTests()
  queryClient = createTestQueryClient()
  // Reset version-store + persistence-store to a known state.
  useVersionStore.setState({
    drawerOpenByDiagram: {},
    preview: null,
    undoRestore: null,
    pendingRestoreFromId: null,
  })
})

afterEach(() => {
  __teardownVersionStoreBootstrapForTests()
})

function flush() {
  return new Promise((r) => setTimeout(r, 0))
}

describe("versionStoreBootstrap", () => {
  it("exits preview when cross-tab broadcast says the previewed row was deleted", async () => {
    // Seed one version locally.
    const created = await LocalVersionRepository.create(
      DIAGRAM_ID,
      {
        version: "4.0.0",
        id: DIAGRAM_ID,
        title: "t",
        type: "ClassDiagram",
        nodes: [
          {
            id: "n",
            type: "Class",
            position: { x: 0, y: 0 },
            width: 1,
            height: 1,
            data: {},
          },
        ],
        edges: [],
        assessments: {},
      } as never,
      { name: "v1" }
    )

    // Load the version list into the query cache (as a mounted drawer would),
    // then stage the store to look like it's previewing the row, and drive the
    // broadcast from a SIBLING channel object (BroadcastChannel doesn't echo
    // to the same channel that posted, so the module's singleton would
    // otherwise miss it).
    await queryClient.prefetchInfiniteQuery(
      versionListQueryOptions("local", DIAGRAM_ID)
    )
    useVersionStore.setState({
      drawerOpenByDiagram: { [DIAGRAM_ID]: true },
      preview: {
        diagramId: DIAGRAM_ID,
        versionId: created.id,
        body: { id: DIAGRAM_ID } as never,
      },
    })
    ensureVersionStoreBootstrapped(queryClient)

    // Delete the body in IDB (so the post-broadcast refetch finds the row gone).
    await LocalVersionRepository.delete(DIAGRAM_ID, created.id)

    // Drive the bootstrap's listener as if a peer tab posted.
    const peer = new BroadcastChannel("apollon-versions")
    peer.postMessage({ type: "invalidate", diagramId: DIAGRAM_ID })
    peer.close()

    // Drain the microtask queue across the message dispatch, the refetch
    // promise, and the resulting state update.
    await flush()
    await flush()
    await flush()

    expect(useVersionStore.getState().preview).toBeNull()
  })

  it("cascade-purges the IDB version trail when a local diagram is deleted", async () => {
    // Seed both a local diagram and a version trail for it.
    usePersistenceModelStore.setState({
      models: {
        [DIAGRAM_ID]: {
          id: DIAGRAM_ID,
          model: {
            version: "4.0.0",
            id: DIAGRAM_ID,
            title: "t",
            type: "ClassDiagram",
            nodes: [],
            edges: [],
            assessments: {},
          } as never,
          lastModifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          favorite: false,
        },
      },
      currentModelId: DIAGRAM_ID,
    })

    await LocalVersionRepository.create(
      DIAGRAM_ID,
      {
        version: "4.0.0",
        id: DIAGRAM_ID,
        title: "t",
        type: "ClassDiagram",
        nodes: [
          {
            id: "n",
            type: "Class",
            position: { x: 0, y: 0 },
            width: 1,
            height: 1,
            data: {},
          },
        ],
        edges: [],
        assessments: {},
      } as never,
      { name: "v1" }
    )

    ensureVersionStoreBootstrapped(queryClient)

    expect((await LocalVersionRepository.list(DIAGRAM_ID)).total).toBe(1)

    usePersistenceModelStore.getState().deleteModel(DIAGRAM_ID)
    await flush()
    await flush()

    expect((await LocalVersionRepository.list(DIAGRAM_ID)).total).toBe(0)
  })
})
