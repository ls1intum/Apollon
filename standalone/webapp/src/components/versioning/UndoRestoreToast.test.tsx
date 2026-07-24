import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ToastContainer } from "react-toastify"
import { QueryClientProvider } from "@tanstack/react-query"
import { VersionRepositoryProvider } from "@/contexts/VersionRepositoryContext"
import { EditorContext } from "@/contexts/EditorContext"
import { createTestQueryClient } from "@/test/queryTestUtils"
import { useVersionStore } from "@/stores/useVersionStore"
import { stubVersionRepository } from "@/test/versionRepositoryStub"
import type { VersionRepository } from "@/services/versionRepository"
import type { ApollonEditor, UMLModel } from "@tumaet/apollon"
import { UndoRestoreToast } from "./UndoRestoreToast"

const DIAGRAM_ID = "d1"
const model = { nodes: [], edges: [] } as unknown as UMLModel

let restoreRepository: () => void = () => {}

afterEach(() => {
  restoreRepository()
  restoreRepository = () => {}
  cleanup()
  useVersionStore.setState({ undoRestore: null, preview: null })
  vi.restoreAllMocks()
})

/**
 * Mirrors the real tree: react-toastify renders toast content at its
 * container, and `__root.tsx` mounts that container as a SIBLING of the
 * routed page — i.e. outside the route's VersionRepositoryProvider. Only the
 * driver is inside it.
 */
function mount(repository: Partial<VersionRepository>) {
  restoreRepository = stubVersionRepository("remote", repository)

  const editor = { model } as unknown as ApollonEditor
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <EditorContext
        value={{
          editor,
          setEditor: vi.fn(),
          diagramName: "",
          setDiagramName: vi.fn(),
        }}
      >
        <VersionRepositoryProvider kind="remote">
          <UndoRestoreToast />
        </VersionRepositoryProvider>
        <ToastContainer />
      </EditorContext>
    </QueryClientProvider>
  )
}

describe("UndoRestoreToast", () => {
  it("undoes the restore through the backend the editor route declared", async () => {
    const restore = vi.fn().mockResolvedValue({
      updatedAt: "",
      autoSnapshotVersionId: "auto-2",
    })
    mount({ restore })

    useVersionStore.getState().completeRestore({
      diagramId: DIAGRAM_ID,
      autoSnapshotVersionId: "auto-1",
      restoredFromVersionId: "v1",
      restoredVersionName: "Milestone",
    })

    await userEvent.click(await screen.findByRole("button", { name: /undo/i }))

    // Restores the pre-restore auto-snapshot, passing the live canvas so the
    // undo's own snapshot captures what the user is looking at.
    await waitFor(() =>
      expect(restore).toHaveBeenCalledWith(
        DIAGRAM_ID,
        "auto-1",
        expect.objectContaining({ currentBody: model })
      )
    )
    await waitFor(() =>
      expect(useVersionStore.getState().undoRestore).toBeNull()
    )
  })
})
