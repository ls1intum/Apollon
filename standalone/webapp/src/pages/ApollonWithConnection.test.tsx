import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useNavigate } from "react-router"
import { toast } from "react-toastify"
import { ApollonWithConnection } from "./ApollonWithConnection"
import { EditorProvider, ModalProvider } from "@/contexts"

const FakeApollonEditor = vi.hoisted(
  () =>
    class FakeApollonEditor {
      model: object = {}
      destroy() {}
      setLocalAwarenessState() {}
      setLocalAwarenessCursor() {}
      setLocalAwarenessSelectedElement() {}
      subscribeToModelChange() {
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
      unsubscribe() {}
      setReadonly() {}
      setPreviewMode() {}
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

vi.mock("@tumaet/apollon/react", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  const React = await import("react")
  // The real <Apollon> instantiates the real ApollonEditor (jsdom-incompatible).
  // Substitute one that hands the fake instance to onMount and stays out of the way.
  const Apollon = React.forwardRef<
    unknown,
    { onMount?: (e: unknown) => void | (() => void) }
  >(function Apollon(props, ref) {
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
  })
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

vi.mock("@/stores/useVersionStore", () => {
  const state = {
    preview: null,
    pendingRestoreFromId: null,
    undoRestore: null,
    exitPreview: vi.fn(),
    restoreVersion: vi.fn(),
    applyControlEvent: vi.fn(),
    fetchVersions: vi.fn(),
  }
  const hook = (selector?: (s: typeof state) => unknown) =>
    selector ? selector(state) : state
  ;(hook as unknown as { getState: typeof hook }).getState = () => state
  return { useVersionStore: hook }
})

// VersionDrawer / Sidebar / Banner need their own mocks of `react-router`'s
// router context to render; they aren't under test here.
vi.mock("@/components/versioning", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    UndoRestoreSnackbar: () => null,
    VersionDrawer: () => null,
    VersionPreviewBanner: () => null,
    VersionSidebar: () => null,
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

let testNavigate: (path: string) => void = () => {}
function NavigateProbe() {
  testNavigate = useNavigate()
  return null
}

function mountAt(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <EditorProvider>
        <ModalProvider>
          <NavigateProbe />
          <Routes>
            <Route path="/:diagramId" element={<ApollonWithConnection />} />
          </Routes>
        </ModalProvider>
      </EditorProvider>
    </MemoryRouter>
  )
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
  fetchHoisted.state.pending = null
  testNavigate = () => {}
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

describe("ApollonWithConnection — loading-state regression", () => {
  it("shows the loading overlay while the initial diagram fetch is in flight", () => {
    mountAt("/abc?view=COLLABORATE")
    expect(screen.getByText(LOADING_TEXT)).toBeTruthy()
  })

  it("removes the loading overlay once the editor is mounted", async () => {
    mountAt("/abc?view=COLLABORATE")
    await resolveFetch()
    await waitFor(() => expect(screen.queryByText(LOADING_TEXT)).toBeNull())
  })

  it("re-shows the loading overlay when diagramId changes (Share-again)", async () => {
    mountAt("/abc?view=COLLABORATE")
    await resolveFetch({ id: "abc", nodes: [], edges: [] })
    await waitFor(() => expect(screen.queryByText(LOADING_TEXT)).toBeNull())

    await act(async () => testNavigate("/def?view=COLLABORATE"))
    expect(await screen.findByText(LOADING_TEXT)).toBeTruthy()

    await resolveFetch({ id: "def", nodes: [], edges: [] })
    await waitFor(() => expect(screen.queryByText(LOADING_TEXT)).toBeNull())
  })

  it("does not show an error toast when unmount races a pending fetch", async () => {
    const errorToast = vi.spyOn(toast, "error")
    const rendered = mountAt("/abc?view=COLLABORATE")
    await waitFor(() => expect(fetchHoisted.state.pending).not.toBeNull())

    rendered.unmount()
    await act(async () => {
      await Promise.resolve()
    })

    expect(errorToast).not.toHaveBeenCalled()
  })

  it("re-opens the collab-name prompt for each new un-named diagram", async () => {
    sessionStorage.removeItem("apollon-collab-name")
    mountAt("/abc?view=COLLABORATE")

    await waitFor(() => {
      expect(modalHoisted.openModal).toHaveBeenCalledWith(
        "COLLABORATE_NAME",
        expect.any(Object)
      )
    })

    modalHoisted.openModal.mockClear()
    await act(async () => testNavigate("/def?view=COLLABORATE"))
    await waitFor(() =>
      expect(modalHoisted.openModal).toHaveBeenCalledWith(
        "COLLABORATE_NAME",
        expect.any(Object)
      )
    )
  })

  it("returns home when the collaboration-name prompt is dismissed", async () => {
    sessionStorage.removeItem("apollon-collab-name")
    mountAt("/abc?view=COLLABORATE")

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

    expect(window.location.pathname + window.location.search).toBe("/")
  })
})
