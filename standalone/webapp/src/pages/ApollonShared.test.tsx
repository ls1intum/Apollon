import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, screen, waitFor } from "@testing-library/react"
import { renderWithRouter } from "@/test/renderWithRouter"
import { toast } from "react-toastify"
import { ApollonShared } from "./ApollonShared"
import { EditorProvider, ModalProvider } from "@/contexts"
import { DiagramApiClient } from "@/services/DiagramApiClient"

const addSharedDiagramEntryMock = vi.fn()

// Holds the most recently mounted fake editor so a test can drive it directly.
const editorHoisted = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance: null as any,
}))

const FakeApollonEditor = vi.hoisted(
  () =>
    class FakeApollonEditor {
      model: object = {}
      // The live Yjs model the real editor restores when preview mode is left.
      liveModel: object | undefined = undefined
      modelChangeCb: (() => void) | null = null
      previewMode = false
      constructor() {
        // The component instantiates its editor via `new ApollonEditor(...)`;
        // capture it so a test can drive the same instance the autosaver uses.
        editorHoisted.instance = this
      }
      destroy() {}
      setLocalAwarenessState() {}
      setLocalAwarenessCursor() {}
      setLocalAwarenessSelectedElement() {}
      subscribeToModelChange(cb: () => void) {
        this.modelChangeCb = cb
        return 1
      }
      subscribeToSelectionChange() {
        return 2
      }
      subscribeToAwarenessChanges() {
        return 3
      }
      subscribeToCollaboratorChanges() {
        return 4
      }
      subscribeToDiagramNameChange() {
        return 5
      }
      getDiagramMetadata() {
        return { diagramTitle: "Fake Diagram" }
      }
      unsubscribe() {}
      setReadonly() {}
      setPreviewMode(active: boolean) {
        this.previewMode = active
        // Mirror the real resync: leaving preview restores the live Yjs model.
        if (!active && this.liveModel !== undefined) this.model = this.liveModel
      }
      fitView() {}
      getLocalAwarenessClientId() {
        return 0
      }
      flowToScreenPosition() {
        return null
      }
      screenToFlowPosition() {
        return null
      }
    }
)

vi.mock("@tumaet/apollon", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  const React = await import("react")
  // The real <Apollon> instantiates the real ApollonEditor (jsdom-incompatible).
  // Substitute one that hands the fake instance to onMount and stays out of the way.
  const Apollon = (props: {
    onMount?: (e: unknown) => void | (() => void)
    ref?: React.Ref<unknown>
  }) => {
    const { ref } = props
    const instanceRef = React.useRef<unknown>(null)
    React.useEffect(() => {
      const instance = new FakeApollonEditor()
      instanceRef.current = instance
      if (typeof ref === "function") ref(instance)
      else if (ref) (ref as { current: unknown }).current = instance
      const cleanup = props.onMount?.(instance)
      return () => {
        if (typeof cleanup === "function") cleanup()
        if (typeof ref === "function") ref(null)
        else if (ref) (ref as { current: unknown }).current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return React.createElement("div", { "data-testid": "apollon-canvas" })
  }
  return {
    ...actual,
    Apollon,
    ApollonEditor: FakeApollonEditor,
    ApollonMode: { Modelling: "Modelling", Assessment: "Assessment" },
    importDiagram: (m: unknown) => m,
  }
})

vi.mock("@/services/WebSocketManager", () => ({
  WebSocketManager: class {
    constructor() {}
    startConnection() {}
    onControl() {
      return () => {}
    }
    cleanup() {}
  },
}))

vi.mock("@/utils/sharedDiagramStorage", () => ({
  addSharedDiagramEntry: (...args: unknown[]) =>
    addSharedDiagramEntryMock(...args),
}))

const fetchHoisted = vi.hoisted(() => {
  const state: {
    pending: { resolve: (v: object) => void } | null
  } = { pending: null }
  return { state }
})

vi.mock("@/services/DiagramApiClient", () => ({
  ApiError: class extends Error {},
  DiagramApiClient: {
    fetchDiagram: vi.fn(
      (_diagramId: string, opts: { signal?: AbortSignal } = {}) =>
        new Promise<object>((resolve, reject) => {
          opts.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true }
          )
          fetchHoisted.state.pending = { resolve }
        })
    ),
    sendDiagramUpdate: vi.fn(() =>
      Promise.resolve({ headRev: 1, updatedAt: "" })
    ),
    createDiagram: vi.fn(() => Promise.resolve({ id: "ignored" })),
  },
  VersionApiClient: {
    list: vi.fn(() =>
      Promise.resolve({ versions: [], nextCursor: undefined, total: 0 })
    ),
  },
}))

const versionHoisted = vi.hoisted(() => {
  const state = {
    preview: null as { versionId: string; body: object } | null,
    pendingRestoreFromId: null,
    undoRestore: null,
    exitPreview: vi.fn(),
    restoreVersion: vi.fn(),
    applyControlEvent: vi.fn(),
    fetchVersions: vi.fn(),
  }
  return { state }
})

vi.mock("@/stores/useVersionStore", () => {
  const state = versionHoisted.state
  const hook = (selector?: (s: typeof state) => unknown) =>
    selector ? selector(state) : state
  ;(hook as unknown as { getState: () => typeof state }).getState = () => state
  // Single-diagram page, so scoped preview === the global preview here.
  return {
    useVersionStore: hook,
    selectScopedPreview: (s: typeof state) => s.preview,
  }
})

// Not under test; stub the versioning widgets.
vi.mock("@/components/versioning", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    UndoRestoreToast: () => null,
    VersionDrawer: () => null,
    VersionPreviewBanner: () => null,
    VersionRail: () => null,
  }
})

const modalHoisted = vi.hoisted(() => ({
  openModal: vi.fn<(name: string, props?: unknown) => void>(),
  closeModal: vi.fn(),
}))
vi.mock("@/contexts", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    useModalContext: () => ({
      openModal: modalHoisted.openModal,
      closeModal: modalHoisted.closeModal,
      currentModal: null,
    }),
  }
})

const LOADING_TEXT = "Loading diagram…"

function mountAt(initialEntry: string) {
  // The page reads getRouteApi("/shared/$diagramId"), so it must mount under
  // that template; "/" is included so its navigate({ to: "/" }) fallback
  // resolves. Drive in-test route changes with the returned `history.push`.
  return renderWithRouter(<ApollonShared />, {
    initialEntry,
    routePaths: ["/shared/$diagramId", "/"],
    wrapper: (children) => (
      <EditorProvider>
        <ModalProvider>{children}</ModalProvider>
      </EditorProvider>
    ),
  })
}

async function resolveFetch(model: object = { nodes: [], edges: [] }) {
  await waitFor(() => expect(fetchHoisted.state.pending).not.toBeNull())
  await act(async () => {
    const pending = fetchHoisted.state.pending!
    fetchHoisted.state.pending = null
    pending.resolve(model)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  addSharedDiagramEntryMock.mockReset()
  fetchHoisted.state.pending = null
  editorHoisted.instance = null
  versionHoisted.state.preview = null
  versionHoisted.state.exitPreview.mockImplementation(() => {
    versionHoisted.state.preview = null
  })
  sessionStorage.setItem("apollon-collab-name", "tester")
  // jsdom lacks ResizeObserver; the version-preview column uses it.
  if (typeof globalThis.ResizeObserver === "undefined") {
    class NoopResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(
      globalThis as unknown as { ResizeObserver: typeof NoopResizeObserver }
    ).ResizeObserver = NoopResizeObserver
  }
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  vi.restoreAllMocks()
})

describe("ApollonShared — loading-state regression", () => {
  it("shows the loading overlay while the initial diagram fetch is in flight", async () => {
    mountAt("/shared/abc?view=COLLABORATE")
    expect(await screen.findByText(LOADING_TEXT)).toBeTruthy()
  })

  it("removes the loading overlay once the editor is mounted", async () => {
    mountAt("/shared/abc?view=COLLABORATE")
    await resolveFetch()
    await waitFor(() => expect(screen.queryByText(LOADING_TEXT)).toBeNull())
  })

  it("stores a successfully opened shared diagram for the dashboard", async () => {
    mountAt("/shared/abc?view=GIVE_FEEDBACK")

    await resolveFetch({ id: "abc", nodes: [], edges: [] })

    await waitFor(() =>
      expect(addSharedDiagramEntryMock).toHaveBeenCalledWith("abc", {
        lastSharedView: "GIVE_FEEDBACK",
      })
    )
  })

  it("re-shows the loading overlay when diagramId changes (Share-again)", async () => {
    const { history } = mountAt("/shared/abc?view=COLLABORATE")
    await resolveFetch({ id: "abc", nodes: [], edges: [] })
    await waitFor(() => expect(screen.queryByText(LOADING_TEXT)).toBeNull())

    await act(async () => {
      history.push("/shared/def?view=COLLABORATE")
    })
    expect(await screen.findByText(LOADING_TEXT)).toBeTruthy()

    await resolveFetch({ id: "def", nodes: [], edges: [] })
    await waitFor(() => expect(screen.queryByText(LOADING_TEXT)).toBeNull())
  })

  it("does not show an error toast when unmount races a pending fetch", async () => {
    const errorToast = vi.spyOn(toast, "error")
    const rendered = mountAt("/shared/abc?view=COLLABORATE")
    await waitFor(() => expect(fetchHoisted.state.pending).not.toBeNull())

    rendered.unmount()
    await act(async () => {
      await Promise.resolve()
    })

    expect(errorToast).not.toHaveBeenCalled()
  })

  it("persists a pending edit when navigating away during a version preview", async () => {
    const sendUpdate = vi.mocked(DiagramApiClient.sendDiagramUpdate)
    const rendered = mountAt("/shared/abc?view=COLLABORATE")
    await resolveFetch({ id: "abc", nodes: [], edges: [] })

    const instance = editorHoisted.instance as InstanceType<
      typeof FakeApollonEditor
    >
    await waitFor(() => expect(instance.modelChangeCb).not.toBeNull())

    // The user edits: the live diagram gains a node and a model change marks the
    // autosaver dirty (no save fires yet — it's still inside the debounce).
    const liveModel = { id: "abc", nodes: [{ id: "n1" }], edges: [] }
    instance.liveModel = liveModel
    instance.model = liveModel
    await act(async () => instance.modelChangeCb?.())

    // Enter a version preview: the autosaver pauses and the canvas overlays an
    // older snapshot in place of the live model.
    versionHoisted.state.preview = {
      versionId: "v1",
      body: { id: "abc", nodes: [], edges: [] },
    }
    instance.model = { id: "abc", nodes: [], edges: [] }
    const previewSpy = vi.spyOn(instance, "setPreviewMode")
    sendUpdate.mockClear()

    // Navigate away while still in preview — teardown must not drop the edit.
    rendered.unmount()

    await waitFor(() => expect(sendUpdate).toHaveBeenCalledTimes(1))
    // Teardown left preview before flushing, and the flush persisted the LIVE
    // diagram — not the previewed snapshot.
    expect(previewSpy).toHaveBeenCalledWith(false)
    expect(versionHoisted.state.exitPreview).toHaveBeenCalled()
    expect(sendUpdate.mock.calls[0][1]).toEqual(liveModel)
  })

  it("re-opens the collab-name prompt for each new un-named diagram", async () => {
    sessionStorage.removeItem("apollon-collab-name")
    const { history } = mountAt("/shared/abc?view=COLLABORATE")

    await waitFor(() => {
      expect(modalHoisted.openModal).toHaveBeenCalledWith(
        "COLLABORATE_NAME",
        expect.any(Object)
      )
    })

    modalHoisted.openModal.mockClear()
    await act(async () => {
      history.push("/shared/def?view=COLLABORATE")
    })
    await waitFor(() =>
      expect(modalHoisted.openModal).toHaveBeenCalledWith(
        "COLLABORATE_NAME",
        expect.any(Object)
      )
    )
  })

  it("returns home when the collaboration-name prompt is dismissed", async () => {
    sessionStorage.removeItem("apollon-collab-name")
    const { router } = mountAt("/shared/abc?view=COLLABORATE")

    await waitFor(() => {
      expect(modalHoisted.openModal).toHaveBeenCalledWith(
        "COLLABORATE_NAME",
        expect.objectContaining({
          onClose: expect.any(Function),
        })
      )
    })

    const modalProps = modalHoisted.openModal.mock.calls[0]?.[1] as
      | { onClose?: () => void }
      | undefined

    await act(async () => {
      modalProps?.onClose?.()
    })

    // In-memory history never touches window.location; assert router state.
    await waitFor(() => expect(router.state.location.pathname).toBe("/"))
  })

  it("toasts and redirects home when the view param is absent/invalid", async () => {
    const errorToast = vi.spyOn(toast, "error")
    const { router } = mountAt("/shared/abc")

    await waitFor(() => {
      expect(errorToast).toHaveBeenCalledWith("Invalid view type")
      expect(router.state.location.pathname).toBe("/")
    })
  })
})
