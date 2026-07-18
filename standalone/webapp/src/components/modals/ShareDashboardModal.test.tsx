import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { ShareDashboardModal } from "./ShareDashboardModal"
import { QueryClientProvider } from "@tanstack/react-query"
import { renderWithRouter } from "@/test/renderWithRouter"
import { createTestQueryClient } from "@/test/queryTestUtils"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { DiagramView } from "@/types"

const openModalMock = vi.fn()
const closeModalMock = vi.fn()
const createDiagramMock = vi.fn()
const addSharedDiagramEntryMock = vi.fn()
const updateSharedDiagramViewMock = vi.fn()

vi.mock("@/contexts", () => ({
  useModalContext: () => ({
    closeModal: closeModalMock,
    openModal: openModalMock,
  }),
}))

vi.mock("@/contexts/ModalProgressContext", () => ({
  useModalProgress: () => ({
    setLoading: vi.fn(),
  }),
}))

vi.mock("@/services/DiagramApiClient", () => ({
  DiagramApiClient: {
    createDiagram: (...args: unknown[]) => createDiagramMock(...args),
  },
}))

vi.mock("@/utils/sharedDiagramStorage", () => ({
  addSharedDiagramEntry: (...args: unknown[]) =>
    addSharedDiagramEntryMock(...args),
  markSharedDiagramCopied: vi.fn(),
  updateSharedDiagramView: (...args: unknown[]) =>
    updateSharedDiagramViewMock(...args),
}))

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("ShareDashboardModal", () => {
  beforeEach(() => {
    openModalMock.mockReset()
    closeModalMock.mockReset()
    createDiagramMock.mockReset()
    addSharedDiagramEntryMock.mockReset()
    updateSharedDiagramViewMock.mockReset()
    sessionStorage.clear()

    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    })

    usePersistenceModelStore.setState({
      currentModelId: "diagram-1",
      models: {
        "diagram-1": {
          id: "diagram-1",
          model: {
            id: "diagram-1",
            type: "ClassDiagram",
            title: "Shared Diagram",
            nodes: [],
            edges: [],
            assessments: {},
            version: "4.0.0",
          },
          lastModifiedAt: "2025-01-01T00:00:00.000Z",
          createdAt: "2025-01-01T00:00:00.000Z",
          favorite: false,
        },
      },
    })
  })

  it("prompts for a collaboration name before opening a shared diagram in collaborate mode", async () => {
    sessionStorage.setItem("apollon-collab-name", "Stored Name")
    createDiagramMock.mockResolvedValue({ id: "shared-123" })

    const { router } = renderWithRouter(
      <ShareDashboardModal modelId="diagram-1" />,
      {
        routePaths: ["/", "/shared/$diagramId"],
        wrapper: (children) => (
          <QueryClientProvider client={createTestQueryClient()}>
            {children}
          </QueryClientProvider>
        ),
      }
    )

    fireEvent.click(await screen.findByRole("button", { name: "Create" }))

    // Collaborate is the default mode, so the freshly created link is already a
    // collaborate link and opening it goes straight to the collab-name prompt.
    await screen.findByDisplayValue(/shared-123\?view=COLLABORATE$/)

    fireEvent.click(screen.getByRole("button", { name: "Open diagram" }))

    expect(openModalMock).toHaveBeenCalledWith("COLLABORATE_NAME", {
      initialName: "Stored Name",
      onConfirm: expect.any(Function),
    })
    // Navigation is gated on the collab-name prompt — nothing has moved yet.
    expect(router.state.location.pathname).toBe("/")
    expect(closeModalMock).not.toHaveBeenCalled()

    const onConfirm = openModalMock.mock.calls[0]?.[1]?.onConfirm as
      | ((name: string) => void)
      | undefined

    onConfirm?.("Chosen Name")

    await waitFor(() => {
      expect(sessionStorage.getItem("apollon-collab-name")).toBe("Chosen Name")
      expect(router.state.location.pathname).toBe("/shared/shared-123")
      expect(router.state.location.search).toEqual({
        view: DiagramView.COLLABORATE,
      })
    })
  })
})
