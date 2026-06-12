import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, useLocation } from "react-router"
import { ToastContainer } from "react-toastify"
import { SaveLocalCopyButton } from "./SaveLocalCopyButton"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { EditorContext } from "@/contexts"
import type { UMLModel } from "@tumaet/apollon"
import type { ApollonEditor } from "@tumaet/apollon/react"

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

/** Renders the current pathname so navigation can be asserted. */
function LocationProbe() {
  const { pathname } = useLocation()
  return <div data-testid="pathname">{pathname}</div>
}

function renderWith(editorModel: UMLModel, initialPath = "/shared/remote-id") {
  const editor = { model: editorModel } as unknown as ApollonEditor
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
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
            path="/shared/:diagramId"
            element={<SaveLocalCopyButton color="black" />}
          />
          <Route path="/local/:id" element={<SaveLocalCopyButton />} />
          <Route path="/" element={<SaveLocalCopyButton />} />
        </Routes>
        <LocationProbe />
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

  it("navigates to the new /local/<id> route after copying", async () => {
    usePersistenceModelStore.setState({ models: {}, currentModelId: null })
    renderWith(fakeModel)

    await userEvent.click(
      screen.getByRole("button", { name: /Save a local copy/i })
    )

    const newId = Object.values(usePersistenceModelStore.getState().models)[0]!
      .model.id
    // Lands on the freshly-created local diagram, not the gallery ("/").
    expect(screen.getByTestId("pathname").textContent).toBe(`/local/${newId}`)
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

  it("does not render on the local editor route (/local/:id)", () => {
    usePersistenceModelStore.setState({ models: {}, currentModelId: null })
    renderWith(fakeModel, "/local/some-local-id")
    expect(
      screen.queryByRole("button", { name: /Save a local copy/i })
    ).toBeNull()
  })

  it("does not render on the gallery route (/)", () => {
    usePersistenceModelStore.setState({ models: {}, currentModelId: null })
    renderWith(fakeModel, "/")
    expect(
      screen.queryByRole("button", { name: /Save a local copy/i })
    ).toBeNull()
  })
})
