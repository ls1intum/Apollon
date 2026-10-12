import { act, cleanup, render } from "@testing-library/react"
import { useOnViewportChange } from "@xyflow/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CollaborationLayer } from "@/components/collaboration/CollaborationLayer"
import * as Y from "yjs"
import { createOverlayStore } from "@/overlay/overlayStore"
import { createDiagramStore } from "@/store/diagramStore"
import { DiagramStoreContext, OverlayStoreContext } from "@/store/context"

const viewportHooks = vi.hoisted(() => ({
  onViewportChange: vi.fn<typeof useOnViewportChange>(),
  reactFlow: {
    getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
    setViewport: vi.fn(),
  },
}))

vi.mock("@xyflow/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@xyflow/react")>()),
  useOnViewportChange: viewportHooks.onViewportChange,
  useReactFlow: () => viewportHooks.reactFlow,
  useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
}))

const documents: Y.Doc[] = []

function mount(reactStrictMode = false) {
  const doc = new Y.Doc()
  documents.push(doc)
  const diagramStore = createDiagramStore(doc)
  const overlayStore = createOverlayStore()
  const awareness = {
    setLocalAwarenessCursor: vi.fn(),
    setLocalAwarenessSelectedElement: vi.fn(),
    setLocalAwarenessViewport: vi.fn(),
    setLocalAwarenessFollowing: vi.fn(),
    getAwarenessStates: () => new Map(),
    getCollaborators: () => [],
    subscribeToAwarenessChanges: () => () => {},
    subscribeToCollaboratorChanges: () => () => {},
    getLocalAwarenessClientId: () => 1,
  }

  const view = render(
    <DiagramStoreContext value={diagramStore}>
      <OverlayStoreContext value={overlayStore}>
        <CollaborationLayer
          awareness={awareness}
          options={{
            enabled: true,
            user: { name: "Local", color: "#336699" },
            showPresence: false,
            showCursors: false,
            showSelectionHighlights: false,
            showFollow: true,
          }}
        />
      </OverlayStoreContext>
    </DiagramStoreContext>,
    { reactStrictMode }
  )

  return { ...view, diagramStore, awareness }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
  for (const doc of documents.splice(0)) doc.destroy()
  vi.restoreAllMocks()
})

describe("ViewportFollow lifetime", () => {
  it("cancels pending work and ignores retained callbacks in preview", () => {
    const requestFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockReturnValue(42)
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame")
    const { diagramStore, awareness } = mount()
    const callbacks = viewportHooks.onViewportChange.mock.calls.at(-1)![0]
    awareness.setLocalAwarenessViewport.mockClear()

    act(() => callbacks.onStart!({ x: 10, y: 20, zoom: 1 }))
    expect(requestFrame).toHaveBeenCalledTimes(1)
    const pendingFrame = requestFrame.mock.calls[0][0]

    act(() => diagramStore.getState().setPreviewMode(true))
    expect(cancelFrame).toHaveBeenCalledWith(42)
    requestFrame.mockClear()

    act(() => {
      callbacks.onStart!({ x: 30, y: 40, zoom: 1 })
      callbacks.onChange!({ x: 50, y: 60, zoom: 1 })
      pendingFrame(0)
    })

    expect(requestFrame).not.toHaveBeenCalled()
    expect(awareness.setLocalAwarenessViewport).not.toHaveBeenCalled()
  })

  it("resets the guard in StrictMode and stops publishing after unmount", () => {
    const requestFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockReturnValue(42)
    const { unmount, awareness } = mount(true)
    const callbacks = viewportHooks.onViewportChange.mock.calls.at(-1)![0]
    const viewport = { x: 10, y: 20, zoom: 1 }
    awareness.setLocalAwarenessViewport.mockClear()

    act(() => callbacks.onChange!(viewport))
    expect(requestFrame).toHaveBeenCalledTimes(1)
    act(() => requestFrame.mock.calls[0][0](0))
    expect(awareness.setLocalAwarenessViewport).toHaveBeenCalledExactlyOnceWith(
      viewport
    )

    unmount()
    requestFrame.mockClear()
    awareness.setLocalAwarenessViewport.mockClear()
    act(() => {
      callbacks.onStart!({ x: 30, y: 40, zoom: 1 })
      callbacks.onChange!({ x: 50, y: 60, zoom: 1 })
    })

    expect(requestFrame).not.toHaveBeenCalled()
    expect(awareness.setLocalAwarenessViewport).not.toHaveBeenCalled()
  })
})
