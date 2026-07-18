import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"
import { renderWithQuery } from "@/test/queryTestUtils"

const { sharedIdRef, createMock } = vi.hoisted(() => ({
  sharedIdRef: { value: undefined as string | undefined },
  createMock: vi.fn(),
}))

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }))
vi.mock("@/contexts", () => ({
  useEditorContext: () => ({
    editor: { model: { title: "My Diagram", type: "ClassDiagram" } },
  }),
  useModalContext: () => ({ closeModal: vi.fn(), openModal: vi.fn() }),
}))
vi.mock("@/contexts/ModalProgressContext", () => ({
  useModalProgress: () => ({ setLoading: vi.fn() }),
}))
vi.mock("@/hooks/useSharedDiagramId", () => ({
  useSharedDiagramId: () => sharedIdRef.value,
}))
vi.mock("@/services/DiagramApiClient", () => ({
  DiagramApiClient: { createDiagram: (...a: unknown[]) => createMock(...a) },
}))
vi.mock("@/utils/sharedDiagramStorage", () => ({
  addSharedDiagramEntry: vi.fn(),
  markSharedDiagramCopied: vi.fn(),
  updateSharedDiagramView: vi.fn(),
}))
vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock("@/stores/usePersistenceModelStore", () => {
  const store = () => null
  store.getState = () => ({ currentModelId: null })
  return { usePersistenceModelStore: store }
})

import { ShareModal } from "./ShareModal"

beforeEach(() => {
  sharedIdRef.value = undefined
  createMock.mockReset()
})

describe("ShareModal", () => {
  it("opens straight on the link for an already-shared diagram, with embed", () => {
    sharedIdRef.value = "shared-xyz"
    renderWithQuery(<ShareModal />)

    expect(screen.getByLabelText("Copy link")).toBeTruthy()
    expect(screen.getByText("Embed")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Open diagram" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Create/i })).toBeNull()
  })

  it("creates the shared diagram exactly once, then shows the link", async () => {
    createMock.mockResolvedValue({ id: "new-1" })
    renderWithQuery(<ShareModal />)

    fireEvent.click(screen.getByRole("button", { name: "Create share link" }))
    // After creation the link appears and the create button is gone.
    expect(await screen.findByLabelText("Copy link")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Open diagram" })).toBeTruthy()
    expect(createMock).toHaveBeenCalledTimes(1)
  })
})
