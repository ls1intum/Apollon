import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, screen, waitFor } from "@testing-library/react"
import type { UMLModel } from "@tumaet/apollon"
import { renderWithRouter } from "@/test/renderWithRouter"
import { EditorContext, ModalProvider } from "@/contexts"
import { VersionSidebarBody } from "./VersionDrawer"
import { useVersionStore } from "@/stores/useVersionStore"
import {
  setVersionRepository,
  type VersionRepository,
} from "@/services/versionRepository"
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

const mount = () =>
  renderWithRouter(<VersionSidebarBody diagramId={DIAGRAM_ID} />, {
    wrapper: (children) => (
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
    ),
  })

afterEach(() => {
  cleanup()
  useVersionStore.setState({
    drawerOpenByDiagram: {},
    saveRequestByDiagram: {},
    versions: {},
    nextCursor: {},
    totals: {},
    loading: {},
    error: {},
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
  let body: ReturnType<typeof deferred<Diagram>>
  let create: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Version rows observe their visibility; jsdom has no IntersectionObserver.
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
    list = deferred()
    body = deferred()
    create = vi.fn()
    setVersionRepository({
      kind: "local",
      cap: 30,
      list: () => list.promise,
      getBody: () => body.promise,
      create,
      permalink: () => null,
    } as unknown as VersionRepository)
  })

  it("waits for the list AND the body before deciding, and skips an unchanged diagram", async () => {
    mount()
    // The router mounts the panel asynchronously — wait for its composer.
    await screen.findByRole("textbox")

    // The page fires the list fetch (unawaited), then the user presses the
    // shortcut while it's still loading.
    act(() => {
      void useVersionStore.getState().fetchVersions(DIAGRAM_ID)
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
      body.resolve(MODEL as unknown as Diagram)
    })
    await waitFor(() => expect(create).not.toHaveBeenCalled())
    // And it genuinely reached a decision (didn't just stay blocked forever).
    expect(useVersionStore.getState().saveRequestByDiagram[DIAGRAM_ID]).toBe(0)
  })
})
