import { describe, it, expect, vi, beforeEach } from "vitest"

// The native plugin and platform must be mocked before the module under test
// imports them (registerPlugin runs at module load). vi.hoisted lets the mock
// factories reference these without the hoisting/TDZ error.
const { mockPlugin, toastWarning, toastSuccess, platformRef } = vi.hoisted(
  () => ({
    mockPlugin: {
      getLegacyDiagrams: vi.fn(),
      isMigrationDone: vi.fn(),
      setMigrationDone: vi.fn(),
    },
    toastWarning: vi.fn(),
    toastSuccess: vi.fn(),
    platformRef: { value: "ios" },
  })
)

vi.mock("@capacitor/core", () => ({
  registerPlugin: () => mockPlugin,
  Capacitor: { getPlatform: () => platformRef.value },
}))

vi.mock("react-toastify", () => ({
  toast: { warning: toastWarning, success: toastSuccess },
}))

import { runLegacyMigrationIfNeeded } from "./legacyMigration"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"

/** A minimal but valid legacy iOS v3 class-diagram export (JSON string). */
function legacyDiagram(id: string, title: string, lastUpdate: string): string {
  return JSON.stringify({
    id,
    title,
    lastUpdate,
    diagramType: "ClassDiagram",
    model: {
      version: "3.0.0",
      type: "ClassDiagram",
      size: { width: 800, height: 600 },
      interactive: { elements: {}, relationships: {} },
      elements: {
        [`${id}-c`]: {
          id: `${id}-c`,
          name: title,
          type: "Class",
          owner: null,
          bounds: { x: 0, y: 0, width: 120, height: 80 },
        },
      },
      relationships: {},
      assessments: {},
    },
  })
}

function resetStore() {
  usePersistenceModelStore.setState({ models: {}, currentModelId: null })
}

describe("runLegacyMigrationIfNeeded", () => {
  beforeEach(() => {
    platformRef.value = "ios"
    vi.clearAllMocks()
    mockPlugin.isMigrationDone.mockResolvedValue({ done: false })
    mockPlugin.getLegacyDiagrams.mockResolvedValue({ diagrams: [] })
    mockPlugin.setMigrationDone.mockResolvedValue(undefined)
    resetStore()
  })

  it("no-ops on non-iOS platforms without touching the plugin", async () => {
    platformRef.value = "web"
    await runLegacyMigrationIfNeeded()
    expect(mockPlugin.isMigrationDone).not.toHaveBeenCalled()
    expect(mockPlugin.getLegacyDiagrams).not.toHaveBeenCalled()
  })

  it("does nothing when migration is already done", async () => {
    mockPlugin.isMigrationDone.mockResolvedValue({ done: true })
    await runLegacyMigrationIfNeeded()
    expect(mockPlugin.getLegacyDiagrams).not.toHaveBeenCalled()
    expect(mockPlugin.setMigrationDone).not.toHaveBeenCalled()
  })

  it("marks done on a fresh install (no legacy diagrams)", async () => {
    const result = await runLegacyMigrationIfNeeded()
    expect(result).toEqual({ migrated: 0, failed: 0 })
    expect(mockPlugin.setMigrationDone).toHaveBeenCalledTimes(1)
    expect(
      Object.keys(usePersistenceModelStore.getState().models)
    ).toHaveLength(0)
  })

  it("imports legacy diagrams, preserves ids/timestamps, selects latest, marks done", async () => {
    mockPlugin.getLegacyDiagrams.mockResolvedValue({
      diagrams: [
        legacyDiagram("diag-old", "Old", "2023-01-01T00:00:00.000Z"),
        legacyDiagram("diag-new", "New", "2024-06-01T00:00:00.000Z"),
      ],
    })

    const result = await runLegacyMigrationIfNeeded()

    const state = usePersistenceModelStore.getState()
    expect(result).toEqual({ migrated: 2, failed: 0 })
    expect(Object.keys(state.models).sort()).toEqual(["diag-new", "diag-old"])
    expect(state.models["diag-old"].lastModifiedAt).toBe(
      "2023-01-01T00:00:00.000Z"
    )
    // Most recently modified diagram becomes current (none was open).
    expect(state.currentModelId).toBe("diag-new")
    expect(mockPlugin.setMigrationDone).toHaveBeenCalledTimes(1)
    expect(toastSuccess).toHaveBeenCalledTimes(1)
  })

  it("isolates a single bad diagram: imports the good ones and warns", async () => {
    mockPlugin.getLegacyDiagrams.mockResolvedValue({
      diagrams: [
        legacyDiagram("good-1", "Good", "2024-01-01T00:00:00.000Z"),
        "{ not valid json",
        JSON.stringify({ id: "junk", title: "Junk", model: { version: "9" } }),
      ],
    })

    const result = await runLegacyMigrationIfNeeded()

    const state = usePersistenceModelStore.getState()
    expect(result).toEqual({ migrated: 1, failed: 2 })
    expect(Object.keys(state.models)).toEqual(["good-1"])
    expect(mockPlugin.setMigrationDone).toHaveBeenCalledTimes(1)
    expect(toastWarning).toHaveBeenCalledTimes(1)
  })

  it("does not steal focus from an already-open diagram", async () => {
    usePersistenceModelStore.setState({ currentModelId: "in-progress" })
    mockPlugin.getLegacyDiagrams.mockResolvedValue({
      diagrams: [legacyDiagram("diag-1", "One", "2024-01-01T00:00:00.000Z")],
    })

    await runLegacyMigrationIfNeeded()

    expect(usePersistenceModelStore.getState().currentModelId).toBe(
      "in-progress"
    )
  })

  it("leaves the done flag unset when the plugin call hard-fails (retry next launch)", async () => {
    mockPlugin.isMigrationDone.mockRejectedValue(new Error("bridge error"))
    const result = await runLegacyMigrationIfNeeded()
    expect(result).toBeUndefined()
    expect(mockPlugin.setMigrationDone).not.toHaveBeenCalled()
  })
})
