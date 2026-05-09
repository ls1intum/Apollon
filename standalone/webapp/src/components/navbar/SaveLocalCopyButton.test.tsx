import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { ToastContainer } from "react-toastify"
import { SaveLocalCopyButton } from "./SaveLocalCopyButton"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { EditorContext } from "@/contexts"
import type { ApollonEditor, UMLModel } from "@tumaet/apollon"

const fakeModel: UMLModel = {
  version: "4.0.0",
  id: "remote-id",
  title: "Original",
  type: "ClassDiagram",
  nodes: [
    {
      id: "n1",
      type: "Class",
      width: 100,
      height: 50,
      position: { x: 0, y: 0 },
      data: { name: "A" },
    },
  ] as unknown as UMLModel["nodes"],
  edges: [],
  assessments: {},
}

function renderWith(editorModel: UMLModel) {
  const editor = { model: editorModel } as unknown as ApollonEditor
  return render(
    <MemoryRouter initialEntries={["/abc?view=COLLABORATE"]}>
      <EditorContext.Provider
        value={{
          editor,
          setEditor: vi.fn(),
          diagramName: "Test",
          setDiagramName: vi.fn(),
        }}
      >
        <Routes>
          <Route
            path="/:diagramId"
            element={<SaveLocalCopyButton color="black" />}
          />
        </Routes>
        <ToastContainer />
      </EditorContext.Provider>
    </MemoryRouter>
  )
}

describe("SaveLocalCopyButton", () => {
  it("creates a deep copy in the persistence store with a fresh id", async () => {
    usePersistenceModelStore.setState({ models: {}, currentModelId: null })
    renderWith(fakeModel)

    await userEvent.click(
      screen.getByRole("button", { name: /Save a local copy/i })
    )

    const models = Object.values(usePersistenceModelStore.getState().models)
    expect(models).toHaveLength(1)
    expect(models[0]!.model.id).not.toBe("remote-id")
    expect(models[0]!.model.title).toBe("Original")
  })

  it("does not share node references with the source model (deep clone)", async () => {
    usePersistenceModelStore.setState({ models: {}, currentModelId: null })
    renderWith(fakeModel)

    await userEvent.click(
      screen.getByRole("button", { name: /Save a local copy/i })
    )

    const stored = Object.values(usePersistenceModelStore.getState().models)[0]!
      .model

    // Mutate the SOURCE — the persistent copy must NOT see the change.
    fakeModel.nodes[0]!.data = { name: "MUTATED" }

    expect(stored.nodes[0]!.data).toEqual({ name: "A" })
    expect(stored.nodes).not.toBe(fakeModel.nodes)
  })

  it("does not render outside a /:diagramId route", () => {
    const editor = { model: fakeModel } as unknown as ApollonEditor
    render(
      <MemoryRouter initialEntries={["/"]}>
        <EditorContext.Provider
          value={{
            editor,
            setEditor: vi.fn(),
            diagramName: "Test",
            setDiagramName: vi.fn(),
          }}
        >
          <Routes>
            <Route path="/" element={<SaveLocalCopyButton />} />
          </Routes>
        </EditorContext.Provider>
      </MemoryRouter>
    )
    expect(
      screen.queryByRole("button", { name: /Save a local copy/i })
    ).toBeNull()
  })
})
