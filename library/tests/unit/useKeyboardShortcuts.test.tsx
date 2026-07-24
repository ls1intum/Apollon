import { describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import { renderHook } from "@testing-library/react"
import { ReactFlowProvider } from "@xyflow/react"
import { createDiagramStore } from "@/store/diagramStore"
import { createMetadataStore } from "@/store/metadataStore"
import { createOverlayStore } from "@/overlay/overlayStore"
import {
  DiagramStoreContext,
  MetadataStoreContext,
  OverlayStoreContext,
} from "@/store/context"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"

/**
 * The hook's own wiring: which document listener exists, and when. What each
 * shortcut then does is `handleShortcutKeydown`'s job — see keyboard.test.ts.
 */
const mount = (keyboardShortcuts = true) => {
  const diagramStore = createDiagramStore()
  const metadataStore = createMetadataStore()
  metadataStore.getState().setKeyboardShortcuts(keyboardShortcuts)
  const overlayStore = createOverlayStore()

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ReactFlowProvider>
      <DiagramStoreContext value={diagramStore}>
        <MetadataStoreContext value={metadataStore}>
          <OverlayStoreContext value={overlayStore}>
            {children}
          </OverlayStoreContext>
        </MetadataStoreContext>
      </DiagramStoreContext>
    </ReactFlowProvider>
  )

  return {
    ...renderHook(() => useKeyboardShortcuts(), { wrapper }),
    diagramStore,
  }
}

const selectAll = () =>
  document.body.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "a",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
  )

describe("useKeyboardShortcuts", () => {
  it("keeps one listener across re-renders and drops it on unmount", () => {
    const add = vi.spyOn(document, "addEventListener")
    const remove = vi.spyOn(document, "removeEventListener")

    const { rerender, unmount, diagramStore } = mount()
    const registrations = () =>
      add.mock.calls.filter(([type]) => type === "keydown").length

    expect(registrations()).toBe(1)

    // The actions close over `nodes`, which change on every drag frame: a
    // dependency on them would tear the listener down and re-add it at ~60Hz.
    rerender()
    diagramStore.getState().setNodes([])
    rerender()
    expect(registrations()).toBe(1)

    unmount()
    expect(remove.mock.calls.some(([type]) => type === "keydown")).toBe(true)

    add.mockRestore()
    remove.mockRestore()
  })

  it("binds nothing when the host turns shortcuts off", () => {
    mount(false)
    // `dispatchEvent` is false only once something calls `preventDefault`.
    expect(selectAll()).toBe(true)
  })

  it("claims the keys it handles", () => {
    mount()
    expect(selectAll()).toBe(false)
  })
})
