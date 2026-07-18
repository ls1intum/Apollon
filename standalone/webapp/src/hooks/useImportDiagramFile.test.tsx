import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest"
import { renderHook } from "@testing-library/react"
import { toast } from "react-toastify"
import { useImportDiagramFile } from "./useImportDiagramFile"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"

let createModel: MockInstance
let success: MockInstance
let error: MockInstance

const navigate = vi.hoisted(() => vi.fn())
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }))

// A minimal valid v4 model; `importDiagram` passes it through with normalisation.
const validDiagram = {
  version: "4.0.0",
  id: "imported-1",
  title: "Imported Diagram",
  type: "ClassDiagram",
  nodes: [],
  edges: [],
  assessments: {},
}

const file = (contents: string, name = "diagram.json") =>
  new File([contents], name, { type: "application/json" })

describe("useImportDiagramFile", () => {
  beforeEach(() => {
    createModel = vi
      .spyOn(usePersistenceModelStore.getState(), "createModel")
      .mockImplementation(() => {})
    success = vi.spyOn(toast, "success").mockImplementation(() => "" as never)
    error = vi.spyOn(toast, "error").mockImplementation(() => "" as never)
    navigate.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const importFile = () =>
    renderHook(() => useImportDiagramFile()).result.current

  it("creates a new local diagram from the file and opens it", async () => {
    await importFile()(file(JSON.stringify(validDiagram)))

    expect(createModel).toHaveBeenCalledWith(
      expect.objectContaining({ id: "imported-1", title: "Imported Diagram" })
    )
    expect(navigate).toHaveBeenCalledWith({
      to: "/local/$id",
      params: { id: "imported-1" },
      replace: true,
    })
    expect(success).toHaveBeenCalledOnce()
  })

  it("reports an invalid JSON file without creating or navigating", async () => {
    await importFile()(file("not json at all"))

    expect(error).toHaveBeenCalledOnce()
    expect(navigate).not.toHaveBeenCalled()
    expect(createModel).not.toHaveBeenCalled()
  })

  it("reports a JSON file that isn't an Apollon diagram", async () => {
    await importFile()(file(JSON.stringify({ hello: "world" })))

    expect(error).toHaveBeenCalledOnce()
    expect(navigate).not.toHaveBeenCalled()
  })
})
