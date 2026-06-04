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
    pending: {
      resolve: (v: object) => void
      reject: (e: unknown) => void
    } | null
  } = { pending: null }
  return { state }
})

const apiErrorHoisted = vi.hoisted(() => ({
  ApiError: class extends Error {
    constructor(
      public readonly status: number,
      public readonly code: string,
      message: string
    ) {
      super(message)
      this.name = "ApiError"
    }
  },
}))

vi.mock("@/services/DiagramApiClient", () => ({
  ApiError: apiErrorHoisted.ApiError,
  DiagramApiClient: {
    fetchDiagram: vi.fn(
      (_diagramId: string, opts: { signal?: AbortSignal } = {}) =>
        new Promise<object>((resolve, reject) => {
          opts.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true }
          )
          fetchHoisted.state.pending = { resolve, reject }
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
            <Route path="/shared/:id" element={<ApollonWithConnection />} />
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

async function rejectFetch(error: unknown) {
  await waitFor(() => expect(fetchHoisted.state.pending).not.toBeNull())
  await act(async () => {
    const pending = fetchHoisted.state.pending!
    fetchHoisted.state.pending = null
    pending.reject(error)
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
    mountAt("/shared/abc?view=COLLABORATE")
    expect(screen.getByText(LOADING_TEXT)).toBeTruthy()
  })

  it("removes the loading overlay once the editor is mounted", async () => {
    mountAt("/shared/abc?view=COLLABORATE")
    await resolveFetch()
    await waitFor(() => expect(screen.queryByText(LOADING_TEXT)).toBeNull())
  })

  it("re-shows the loading overlay when diagramId changes (Share-again)", async () => {
    mountAt("/shared/abc?view=COLLABORATE")
    await resolveFetch({ id: "abc", nodes: [], edges: [] })
    await waitFor(() => expect(screen.queryByText(LOADING_TEXT)).toBeNull())

    await act(async () => testNavigate("/shared/def?view=COLLABORATE"))
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

  it("keeps shared links on a retryable server-unavailable page when fetch fails", async () => {
    const errorToast = vi.spyOn(toast, "error")
    mountAt("/shared/abc?view=EDIT")

    await rejectFetch(new TypeError("Failed to fetch"))

    await expect(screen.findByText("Server unavailable")).resolves.toBeTruthy()
    expect(screen.getByText(/could not reach the server/i)).toBeTruthy()
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy()
    expect(errorToast).not.toHaveBeenCalled()
  })

  it("shows an expired/deleted message for not-found shared diagrams", async () => {
    mountAt("/shared/abc?view=EDIT")

    await rejectFetch(
      new apiErrorHoisted.ApiError(404, "NOT_FOUND", "diagram not found")
    )

    await expect(
      screen.findByText("Shared diagram unavailable")
    ).resolves.toBeTruthy()
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull()
  })

  it("re-opens the collab-name prompt for each new un-named diagram", async () => {
    sessionStorage.removeItem("apollon-collab-name")
    mountAt("/shared/abc?view=COLLABORATE")

    await waitFor(() => {
      expect(modalHoisted.openModal).toHaveBeenCalledWith(
        "COLLABORATE_NAME",
        expect.any(Object)
      )
    })

    modalHoisted.openModal.mockClear()
    await act(async () => testNavigate("/shared/def?view=COLLABORATE"))
    await waitFor(() =>
      expect(modalHoisted.openModal).toHaveBeenCalledWith(
        "COLLABORATE_NAME",
        expect.any(Object)
      )
    )
  })
})
