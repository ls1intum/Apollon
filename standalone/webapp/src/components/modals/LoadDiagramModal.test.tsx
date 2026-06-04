/**
 * Regression test: the load dialog renders outside <Routes>, so it must read
 * the open diagram from the persistence store (currentModelId), not route
 * params. Otherwise the currently-edited diagram is neither highlighted nor
 * delete-guarded, and the user can delete the diagram they're editing.
 */
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { ModalProvider } from "@/contexts"
import { LoadDiagramModal } from "./LoadDiagramModal"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import type { UMLModel } from "@tumaet/apollon"

const makeModel = (id: string, title: string): UMLModel =>
  ({
    id,
    type: "ClassDiagram",
    title,
    nodes: [],
    edges: [],
    assessments: {},
    version: "4.0.0",
  }) as unknown as UMLModel

const seed = (currentModelId: string) => {
  const now = "2025-01-01T00:00:00.000Z"
  usePersistenceModelStore.setState({
    currentModelId,
    models: {
      open: {
        id: "open",
        model: makeModel("open", "Open Diagram"),
        lastModifiedAt: now,
        createdAt: now,
        favorite: false,
      },
      other: {
        id: "other",
        model: makeModel("other", "Other Diagram"),
        lastModifiedAt: now,
        createdAt: now,
        favorite: false,
      },
    },
  })
}

afterEach(() => {
  cleanup()
})

const mount = () =>
  render(
    <MemoryRouter initialEntries={["/local/open"]}>
      <ModalProvider>
        <LoadDiagramModal />
      </ModalProvider>
    </MemoryRouter>
  )

describe("LoadDiagramModal current-diagram guard", () => {
  // Walk up from a title to the row that also holds the per-row delete icon
  // (the flex container with the `p-2` padding from the component markup).
  const rowFor = (title: string): HTMLElement => {
    const row = screen.getByText(title).closest("div.p-2")
    if (!row) throw new Error(`row not found for ${title}`)
    return row as HTMLElement
  }

  it("hides the delete control for the diagram open in the editor", () => {
    seed("open")
    mount()

    // Exactly one diagram is deletable, and it is not the open one.
    expect(screen.getAllByTestId("DeleteOutlineOutlinedIcon")).toHaveLength(1)
    expect(
      within(rowFor("Open Diagram")).queryByTestId("DeleteOutlineOutlinedIcon")
    ).toBeNull()
    expect(
      within(rowFor("Other Diagram")).queryByTestId("DeleteOutlineOutlinedIcon")
    ).not.toBeNull()
  })
})
