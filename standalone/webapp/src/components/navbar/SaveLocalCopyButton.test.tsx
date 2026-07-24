import { describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useLocation } from "@tanstack/react-router"
import { renderWithRouter } from "@/test/renderWithRouter"
import { ToastContainer } from "react-toastify"
import { SaveLocalCopyButton } from "./SaveLocalCopyButton"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { EditorContext } from "@/contexts"
import type { UMLModel } from "@tumaet/apollon"
import type { ApollonEditor } from "@tumaet/apollon"

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
  // /local/$id must be listed so the post-save navigate({ to: "/local/$id" })
  // resolves; the button shows/hides itself off the pathname, not route matching.
  return renderWithRouter(
    <>
      <SaveLocalCopyButton color="black" />
      <LocationProbe />
      <ToastContainer aria-label="Notifications" />
    </>,
    {
      initialEntry: initialPath,
      routePaths: ["/shared/$diagramId", "/local/$id", "/"],
      wrapper: (children) => (
        <EditorContext.Provider
          value={{
            editor,
            setEditor: vi.fn(),
            diagramName: "Test",
            setDiagramName: vi.fn(),
          }}
        >
          {children}
        </EditorContext.Provider>
      ),
    }
  )
}

describe("SaveLocalCopyButton", () => {
  it("creates a deep copy in the persistence store with a fresh id", async () => {
    usePersistenceModelStore.setState({ models: {}, currentModelId: null })
    renderWith(fakeModel)

    await userEvent.click(
      await screen.findByRole("button", { name: /Save a local copy/i })
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
      await screen.findByRole("button", { name: /Save a local copy/i })
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
      await screen.findByRole("button", { name: /Save a local copy/i })
    )

    const stored = Object.values(usePersistenceModelStore.getState().models)[0]!
      .model

    // Mutate the SOURCE — the persistent copy must NOT see the change.
    fakeModel.nodes[0]!.data = { name: "MUTATED" }

    expect(stored.nodes[0]!.data).toEqual({ name: "A" })
    expect(stored.nodes).not.toBe(fakeModel.nodes)
  })

  it("does not render on the local editor route (/local/:id)", async () => {
    usePersistenceModelStore.setState({ models: {}, currentModelId: null })
    renderWith(fakeModel, "/local/some-local-id")
    await screen.findByTestId("pathname")
    expect(
      screen.queryByRole("button", { name: /Save a local copy/i })
    ).toBeNull()
  })

  it("does not render on the gallery route (/)", async () => {
    usePersistenceModelStore.setState({ models: {}, currentModelId: null })
    renderWith(fakeModel, "/")
    await screen.findByTestId("pathname")
    expect(
      screen.queryByRole("button", { name: /Save a local copy/i })
    ).toBeNull()
  })
})
