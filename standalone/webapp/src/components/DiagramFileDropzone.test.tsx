import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"
import { toast } from "react-toastify"
import { DiagramFileDropzone } from "./DiagramFileDropzone"

const importFile = vi.hoisted(() => vi.fn())
vi.mock("@/hooks/useImportDiagramFile", () => ({
  useImportDiagramFile: () => importFile,
}))

/**
 * jsdom has no `DragEvent`, so build a cancelable Event carrying a minimal
 * `DataTransfer`. Dispatching on `document.body` bubbles to the window
 * listeners exactly as a real drag does.
 */
const dispatchDrag = (type: string, types: string[], files: File[] = []) => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, "dataTransfer", {
    value: { types, files, dropEffect: "none" },
  })
  act(() => {
    document.body.dispatchEvent(event)
  })
  return event
}

const fileDrag = (type: string, files: File[] = []) =>
  dispatchDrag(type, ["Files"], files)

const jsonFile = new File(["{}"], "diagram.json", { type: "application/json" })
const pngFile = new File(["x"], "image.png", { type: "image/png" })

const overlay = () => screen.queryByText("Drop to import a diagram")

describe("DiagramFileDropzone", () => {
  beforeEach(() => {
    importFile.mockReset()
    vi.spyOn(toast, "error").mockImplementation(() => "" as never)
    render(<DiagramFileDropzone />)
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("cancels dragover and drop so the browser never opens the file", () => {
    // The whole point: an uncancelled dragover/drop makes the browser navigate
    // to the dropped JSON instead of importing it.
    expect(fileDrag("dragover").defaultPrevented).toBe(true)
    expect(fileDrag("drop", [jsonFile]).defaultPrevented).toBe(true)
  })

  it("still cancels a drop it can't import, rather than opening it", () => {
    expect(fileDrag("drop", [pngFile]).defaultPrevented).toBe(true)
    expect(importFile).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledOnce()
  })

  it("shows the overlay only while a file is over the window", () => {
    expect(overlay()).toBeNull()

    fileDrag("dragenter")
    expect(overlay()).not.toBeNull()

    fileDrag("dragleave")
    expect(overlay()).toBeNull()
  })

  it("stays open across nested enter/leave (drag-depth counter)", () => {
    fileDrag("dragenter") // window
    fileDrag("dragenter") // a child element
    fileDrag("dragleave") // leaving the child
    expect(overlay()).not.toBeNull()

    fileDrag("dragleave") // leaving the window
    expect(overlay()).toBeNull()
  })

  it("imports a dropped .json file and closes the overlay", () => {
    fileDrag("dragenter")
    fileDrag("drop", [jsonFile])

    expect(importFile).toHaveBeenCalledWith(jsonFile)
    expect(overlay()).toBeNull()
  })

  it("leaves a non-file drag (text, links) to the browser", () => {
    const event = dispatchDrag("dragover", ["text/plain"])
    expect(event.defaultPrevented).toBe(false)
    expect(overlay()).toBeNull()
  })
})
