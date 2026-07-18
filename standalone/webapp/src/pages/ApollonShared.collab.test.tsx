import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, waitFor } from "@testing-library/react"
import { toast } from "react-toastify"
import { renderWithRouter } from "@/test/renderWithRouter"
import { wrapWithQueryClient } from "@/test/queryTestUtils"
import { stubVersionRepository } from "@/test/versionRepositoryStub"
import { EditorProvider, ModalProvider } from "@/contexts"
import { useVersionStore } from "@/stores/useVersionStore"
import { ApollonShared } from "./ApollonShared"
import type { ControlEvent, Diagram, VersionSummary } from "@/types"
import type { UMLModel } from "@tumaet/apollon"

/**
 * What a collaborator's actions do to THIS client.
 *
 * The webapp's e2e stack serves the bundled frontend only — no API server, no
 * Redis — so a genuine two-browser collaboration test cannot run in CI. This
 * is the closest honest substitute: the real page, the real version store, the
 * real query cache and the real control-event bridge, driven by the exact
 * `ControlEvent` sequence the server would publish to a peer. Only the
 * transport (WebSocket, HTTP) and the editor are doubles.
 *
 * It therefore covers the client-side reaction to a peer — which is where
 * every defect found while building this layer lived — and NOT the server's
 * behaviour, which the server suite owns.
 */

const DIAGRAM_ID = "collab-1"
const HEAD_MODEL = { id: DIAGRAM_ID, nodes: [{ id: "head" }], edges: [] }
const PREVIEW_BODY = {
  id: DIAGRAM_ID,
  nodes: [{ id: "old" }],
  edges: [],
} as unknown as UMLModel

const wsHoisted = vi.hoisted(() => ({
  control: null as ((event: ControlEvent) => void) | null,
}))
const editorHoisted = vi.hoisted(() => ({ instance: null as unknown }))

const FakeApollonEditor = vi.hoisted(
  () =>
    class FakeApollonEditor {
      model: object = {}
      previewMode = false
      constructor() {
        editorHoisted.instance = this
      }
      destroy() {}
      subscribeToModelChange() {
        return 1
      }
      subscribeToDiagramNameChange() {
        return 2
      }
      getDiagramMetadata() {
        return { diagramTitle: "Collab" }
      }
      unsubscribe() {}
      setReadonly() {}
      setPreviewMode(active: boolean) {
        this.previewMode = active
      }
      fitView() {}
    }
)

vi.mock("@tumaet/apollon", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    ApollonEditor: FakeApollonEditor,
    ApollonMode: { Modelling: "Modelling", Assessment: "Assessment" },
    importDiagram: (m: unknown) => m,
  }
})

vi.mock("@/services/WebSocketManager", () => ({
  WebSocketManager: class {
    startConnection() {}
    onControl(listener: (event: ControlEvent) => void) {
      wsHoisted.control = listener
      return () => {
        wsHoisted.control = null
      }
    }
    cleanup() {}
  },
}))

const fetchDiagram = vi.hoisted(() => vi.fn())
vi.mock("@/services/DiagramApiClient", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    DiagramApiClient: {
      fetchDiagram,
      sendDiagramUpdate: vi.fn(async () => ({ headRev: 1, updatedAt: "" })),
    },
  }
})

vi.mock("@/utils/sharedDiagramStorage", () => ({
  addSharedDiagramEntry: vi.fn(),
}))

const version = (id: string): VersionSummary => ({
  id,
  diagramId: DIAGRAM_ID,
  name: id,
  description: "",
  createdAt: "2026-04-29T12:00:00Z",
  kind: "user",
  librarySchemaVersion: "4.0.0",
})

let restoreRepository: () => void = () => {}

const emit = async (event: ControlEvent) => {
  await act(async () => {
    wsHoisted.control!(event)
  })
}

/**
 * `?version=` is the source of truth for preview — the URL↔store sync clears
 * any preview the URL doesn't name — so a preview is opened by mounting with
 * the param, exactly as a deep link or a drawer click does.
 */
async function mountEditor({
  previewVersion,
}: { previewVersion?: string } = {}) {
  const search = previewVersion
    ? `?view=COLLABORATE&version=${previewVersion}`
    : "?view=COLLABORATE"
  const view = renderWithRouter(<ApollonShared />, {
    initialEntry: `/shared/${DIAGRAM_ID}${search}`,
    routePaths: ["/shared/$diagramId", "/"],
    wrapper: (children) =>
      wrapWithQueryClient(
        <EditorProvider>
          <ModalProvider>{children}</ModalProvider>
        </EditorProvider>
      ),
  })
  await waitFor(() => expect(wsHoisted.control).not.toBeNull())
  return view
}

beforeEach(() => {
  sessionStorage.setItem("apollon-collab-name", "tester")
  wsHoisted.control = null
  editorHoisted.instance = null
  fetchDiagram.mockReset()
  fetchDiagram.mockResolvedValue(HEAD_MODEL as unknown as Diagram)
  restoreRepository = stubVersionRepository("remote", {
    list: async () => ({
      versions: [version("v1")],
      nextCursor: undefined,
      total: 1,
    }),
    getBody: async () => PREVIEW_BODY as unknown as Diagram,
  })
})

afterEach(() => {
  cleanup()
  restoreRepository()
  restoreRepository = () => {}
  useVersionStore.setState({
    preview: null,
    undoRestore: null,
    pendingRestoreFromId: null,
    drawerOpenByDiagram: {},
    saveRequestByDiagram: {},
  })
  sessionStorage.clear()
  vi.restoreAllMocks()
})

describe("a collaborator's actions, as this client sees them", () => {
  it("refreshes the canvas and announces a peer's restore", async () => {
    await mountEditor()
    const editor = editorHoisted.instance as { model: object }
    const infoToast = vi.spyOn(toast, "info")
    fetchDiagram.mockClear()

    await emit({
      type: "VERSION_RESTORED",
      headRev: 2,
      updatedAt: "",
      autoSnapshotVersionId: "auto-1",
      restoredFromVersionId: "peer-version",
      actor: "Ada",
    })

    await waitFor(() => expect(editor.model).toEqual(HEAD_MODEL))
    expect(infoToast).toHaveBeenCalledWith(
      expect.stringContaining("Ada"),
      expect.anything()
    )
  })

  it("leaves the canvas alone when the peer's restore is the echo of our own", async () => {
    await mountEditor()
    const editor = editorHoisted.instance as { model: object }
    const before = editor.model
    fetchDiagram.mockClear()

    // The restore mutation raises this before its request leaves; the echo
    // usually beats the HTTP response home.
    act(() => useVersionStore.getState().beginRestore("mine"))
    await emit({
      type: "VERSION_RESTORED",
      headRev: 2,
      updatedAt: "",
      autoSnapshotVersionId: "auto-1",
      restoredFromVersionId: "mine",
      actor: "tester",
    })

    expect(fetchDiagram).not.toHaveBeenCalled()
    expect(editor.model).toBe(before)
  })

  it("does not overwrite the read-only preview a peer's restore lands during", async () => {
    await mountEditor({ previewVersion: "v1" })
    const editor = editorHoisted.instance as {
      model: object
      previewMode: boolean
    }
    await waitFor(() => expect(editor.previewMode).toBe(true))
    const shown = editor.model
    fetchDiagram.mockClear()

    await emit({
      type: "VERSION_RESTORED",
      headRev: 3,
      updatedAt: "",
      autoSnapshotVersionId: "auto-2",
      restoredFromVersionId: "peer-version",
      actor: "Ada",
    })

    // Assigning HEAD here would write into the preview overlay: the user would
    // watch the snapshot they are inspecting silently become something else,
    // and the write would be discarded on exit anyway.
    await new Promise((r) => setTimeout(r, 20))
    expect(editor.model).toBe(shown)
    expect(useVersionStore.getState().preview?.versionId).toBe("v1")
  })

  it("exits preview when the peer deletes the version being previewed", async () => {
    await mountEditor({ previewVersion: "v1" })
    await waitFor(() =>
      expect(useVersionStore.getState().preview?.versionId).toBe("v1")
    )

    await emit({ type: "VERSION_DELETED", versionId: "v1" })

    // Otherwise the canvas keeps rendering a snapshot the server no longer has.
    await waitFor(() => expect(useVersionStore.getState().preview).toBeNull())
  })

  it("keeps previewing when the peer deletes a different version", async () => {
    await mountEditor({ previewVersion: "v1" })
    await waitFor(() =>
      expect(useVersionStore.getState().preview?.versionId).toBe("v1")
    )

    await emit({ type: "VERSION_DELETED", versionId: "other" })

    expect(useVersionStore.getState().preview?.versionId).toBe("v1")
  })
})
