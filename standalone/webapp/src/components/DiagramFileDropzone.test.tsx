import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { toast } from "react-toastify"
import { DiagramFileDropzone } from "./DiagramFileDropzone"

const importFile = vi.hoisted(() => vi.fn())
vi.mock("@/hooks/useImportDiagramFile", () => ({
  useImportDiagramFile: () => importFile,
}))

/** A DragEvent-like init with a DataTransfer carrying the given files. */
const fileDrag = (files: File[]) => ({
  dataTransfer: {
    types: ["Files"],
    files,
    items: files.map((file) => ({ kind: "file", type: file.type })),
    // Set by the component; a plain object is enough for the assertions.
    dropEffect: "none",
  },
})

const jsonFile = new File(["{}"], "diagram.json", { type: "application/json" })
const pngFile = new File(["x"], "image.png", { type: "image/png" })

const overlay = () => screen.queryByText("Drop to import a diagram")

describe("DiagramFileDropzone", () => {
  beforeEach(() => {
    importFile.mockReset()
    vi.spyOn(toast, "error").mockImplementation(() => "" as never)
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  const setup = () => {
    render(
      <DiagramFileDropzone>
        <div data-testid="child">canvas</div>
      </DiagramFileDropzone>
    )
    return screen.getByTestId("child").parentElement!
  }

  it("shows the drop overlay only while a file is dragged over", () => {
    const zone = setup()
    expect(overlay()).toBeNull()

    fireEvent.dragEnter(zone, fileDrag([jsonFile]))
    expect(overlay()).not.toBeNull()

    fireEvent.dragLeave(zone, fileDrag([jsonFile]))
    expect(overlay()).toBeNull()
  })

  it("stays open across nested enter/leave (drag-depth counter)", () => {
    const zone = setup()
    fireEvent.dragEnter(zone, fileDrag([jsonFile])) // onto the zone
    fireEvent.dragEnter(zone, fileDrag([jsonFile])) // onto a child
    fireEvent.dragLeave(zone, fileDrag([jsonFile])) // leaving the child
    expect(overlay()).not.toBeNull()

    fireEvent.dragLeave(zone, fileDrag([jsonFile])) // leaving the zone
    expect(overlay()).toBeNull()
  })

  it("ignores a drag that carries no files (e.g. a palette element)", () => {
    const zone = setup()
    fireEvent.dragEnter(zone, { dataTransfer: { types: ["text/plain"] } })
    expect(overlay()).toBeNull()
  })

  it("imports a dropped .json file", () => {
    const zone = setup()
    fireEvent.drop(zone, fileDrag([jsonFile]))
    expect(importFile).toHaveBeenCalledWith(jsonFile)
    expect(overlay()).toBeNull()
  })

  it("rejects a drop with no .json file", () => {
    const zone = setup()
    fireEvent.drop(zone, fileDrag([pngFile]))
    expect(importFile).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledOnce()
  })
})
