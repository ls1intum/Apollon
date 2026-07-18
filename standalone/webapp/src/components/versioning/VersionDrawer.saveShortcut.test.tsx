import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, screen, waitFor } from "@testing-library/react"
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import type { UMLModel } from "@tumaet/apollon"
import { renderWithRouter } from "@/test/renderWithRouter"
import { createTestQueryClient } from "@/test/queryTestUtils"
import { VersionRepositoryProvider } from "@/contexts/VersionRepositoryContext"
import { EditorContext, ModalProvider } from "@/contexts"
import { VersionSidebarBody } from "./VersionDrawer"
import { useVersionStore } from "@/stores/useVersionStore"
import { stubVersionRepository } from "@/test/versionRepositoryStub"
import type { VersionRepository } from "@/services/versionRepository"
import { versionKeys } from "@/queries/keys"
import type { VersionListData } from "@/queries/versionQueries"
import type { VersionSummary, Diagram } from "@/types"

/**
 * The save shortcut (Ctrl/Cmd+Shift+S) must not write a duplicate version while
 * the version list — and the last version's body — are still loading. This
 * holds both fetches open across the frame where the list first arrives (the
 * frame a lagging `baselineResolved` boolean would have fired on with a stale
 * fingerprint) and asserts nothing is created until the real baseline resolves.
 */

const DIAGRAM_ID = "d-race"

const MODEL: UMLModel = {
  version: "4.0.0",
  id: DIAGRAM_ID,
  title: "Race",
  type: "ClassDiagram",
  nodes: [{ id: "n1", type: "class", position: { x: 0, y: 0 }, data: {} }],
  edges: [],
  assessments: {},
} as unknown as UMLModel

const v1: VersionSummary = {
  id: "v1",
  diagramId: DIAGRAM_ID,
  name: "",
  description: "",
  createdAt: "2026-04-29T12:00:00Z",
  kind: "user",
  librarySchemaVersion: "4.0.0",
}

const v2: VersionSummary = {
  ...v1,
  id: "v2",
  createdAt: "2026-04-29T13:00:00Z",
}

/** A body that differs from the editor's model, so the diagram reads as dirty. */
const OTHER_MODEL = {
  ...MODEL,
  nodes: [{ id: "other", type: "class", position: { x: 50, y: 50 }, data: {} }],
} as unknown as UMLModel

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

const fakeEditor = {
  model: MODEL,
  subscribeToModelChange: () => 1,
  unsubscribe: () => {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

/** The page shape the infinite list query caches, for the peer-save simulation. */
const listPage = (versions: VersionSummary[]): VersionListData => ({
  pages: [{ versions, nextCursor: undefined, total: versions.length }],
  pageParams: [undefined],
})

let queryClient: QueryClient
let restoreRepository: () => void = () => {}

const mount = () =>
  renderWithRouter(<VersionSidebarBody diagramId={DIAGRAM_ID} />, {
    wrapper: (children) => (
      <QueryClientProvider client={queryClient}>
        <VersionRepositoryProvider kind="local">
          <EditorContext
            value={{
              editor: fakeEditor,
              diagramName: "",
              setDiagramName: vi.fn(),
              setEditor: vi.fn(),
            }}
          >
            <ModalProvider>{children}</ModalProvider>
          </EditorContext>
        </VersionRepositoryProvider>
      </QueryClientProvider>
    ),
  })

afterEach(() => {
  cleanup()
  restoreRepository()
  restoreRepository = () => {}
  useVersionStore.setState({
    drawerOpenByDiagram: {},
    saveRequestByDiagram: {},
  })
})

describe("VersionSidebarBody — save shortcut vs the loading window", () => {
  let list: ReturnType<
    typeof deferred<{
      versions: VersionSummary[]
      nextCursor?: string
      total: number
    }>
  >
  let bodies: Record<string, ReturnType<typeof deferred<Diagram>>>
  let create: VersionRepository["create"] & ReturnType<typeof vi.fn>

  beforeEach(() => {
    queryClient = createTestQueryClient()
    list = deferred()
    bodies = { v1: deferred(), v2: deferred() }
    create = vi.fn() as typeof create
    restoreRepository = stubVersionRepository("local", {
      list: () => list.promise,
      getBody: (_diagramId: string, versionId: string) =>
        bodies[versionId]!.promise,
      create,
    })
  })

  it("waits for the list AND the body before deciding, and skips an unchanged diagram", async () => {
    mount()
    // The router mounts the panel asynchronously — wait for its composer.
    await screen.findByRole("textbox")

    // The panel's list query is still in flight (its promise is deferred), and
    // the user presses the shortcut mid-load.
    act(() => {
      useVersionStore.getState().requestSave(DIAGRAM_ID)
    })
    expect(create).not.toHaveBeenCalled()

    // The list arrives with an existing version — the frame a lagging baseline
    // would have fired on. The body is still pending.
    await act(async () => {
      list.resolve({ versions: [v1], total: 1 })
    })
    expect(create).not.toHaveBeenCalled()

    // The body resolves to the same model the editor holds → nothing changed,
    // so the shortcut settles without writing a second, identical version.
    await act(async () => {
      bodies.v1!.resolve(MODEL as unknown as Diagram)
    })
    await waitFor(() => expect(create).not.toHaveBeenCalled())
    // And it genuinely reached a decision (didn't just stay blocked forever).
    await waitFor(() =>
      expect(useVersionStore.getState().saveRequestByDiagram[DIAGRAM_ID]).toBe(
        0
      )
    )
  })

  it("ignores a stale body that resolves after a newer version's", async () => {
    mount()
    await screen.findByRole("textbox")

    await act(async () => {
      list.resolve({ versions: [v1], total: 1 })
    })

    // A collaborator saves while v1's body fetch is still in flight; the
    // realtime bridge writes the newer row into the cached list.
    act(() => {
      queryClient.setQueryData(
        versionKeys.list("local", DIAGRAM_ID),
        listPage([v2, v1])
      )
    })

    // The NEWER body resolves first, then the older, stale one.
    await act(async () => {
      bodies.v2!.resolve(OTHER_MODEL as unknown as Diagram)
    })
    await act(async () => {
      bodies.v1!.resolve(MODEL as unknown as Diagram)
    })

    // The stale resolution must not have re-pointed the baseline at v1 — a
    // save now still completes, against v2's baseline (which differs from the
    // editor's model, so there IS something to save).
    act(() => {
      useVersionStore.getState().requestSave(DIAGRAM_ID)
    })
    await waitFor(() => expect(create).toHaveBeenCalledOnce())
  })
})
