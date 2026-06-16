import "fake-indexeddb/auto"
import { IDBFactory as FDBFactory } from "fake-indexeddb"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  ensureVersionStoreBootstrapped,
  __teardownVersionStoreBootstrapForTests,
} from "./versionStoreBootstrap"
import { useVersionStore } from "./useVersionStore"
import { usePersistenceModelStore } from "./usePersistenceModelStore"
import {
  LocalVersionRepository,
  setVersionRepository,
  RemoteVersionRepository,
} from "@/services/versionRepository"
import { __resetDbForTests } from "@/services/versionRepository/idb"

const DIAGRAM_ID = "boot-test-diagram"

beforeEach(async () => {
  Object.assign(globalThis, { indexedDB: new FDBFactory() })
  __resetDbForTests()
  __teardownVersionStoreBootstrapForTests()
  setVersionRepository(LocalVersionRepository)
  // Reset version-store + persistence-store to a known state.
  useVersionStore.setState({
    drawerOpenByDiagram: {},
    versions: {},
    nextCursor: {},
    totals: {},
    preview: null,
    undoRestore: null,
    pendingRestoreFromId: null,
    loading: {},
    error: {},
  })
})

afterEach(() => {
  __teardownVersionStoreBootstrapForTests()
  setVersionRepository(RemoteVersionRepository)
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

    // Now delete it — but stage the version-store to look like it's
    // previewing the row, then drive the broadcast from a SIBLING channel
    // object (BroadcastChannel doesn't echo to the same channel that
    // posted, so the module's singleton would otherwise miss it).
    useVersionStore.setState({
      drawerOpenByDiagram: { [DIAGRAM_ID]: true },
      versions: { [DIAGRAM_ID]: [created] },
      preview: {
        diagramId: DIAGRAM_ID,
        versionId: created.id,
        body: { id: DIAGRAM_ID } as never,
      },
    })
    ensureVersionStoreBootstrapped()

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

  it("cascade-purges via the local adapter even when the active repo is remote", async () => {
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

    ensureVersionStoreBootstrapped()

    expect((await LocalVersionRepository.list(DIAGRAM_ID)).total).toBe(1)

    setVersionRepository(RemoteVersionRepository)
    usePersistenceModelStore.getState().deleteModel(DIAGRAM_ID)
    await flush()
    await flush()

    expect((await LocalVersionRepository.list(DIAGRAM_ID)).total).toBe(0)
  })

  it("ignores a cross-tab invalidation for a different diagram while previewing", async () => {
    useVersionStore.setState({
      preview: {
        diagramId: DIAGRAM_ID,
        versionId: "v1",
        body: { id: DIAGRAM_ID } as never,
      },
    })
    ensureVersionStoreBootstrapped()
    const preview = useVersionStore.getState().preview

    const peer = new BroadcastChannel("apollon-versions")
    peer.postMessage({ type: "invalidate", diagramId: "other-diagram" })
    peer.close()

    await flush()
    await flush()
    await flush()

    expect(useVersionStore.getState().preview).toBe(preview)
  })
})
