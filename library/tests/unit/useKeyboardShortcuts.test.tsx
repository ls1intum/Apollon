import { afterEach, describe, expect, it, vi } from "vitest"
import type { ReactNode, RefObject } from "react"
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
 * The hook's own wiring: which editor-root listener exists, and when. What each
 * shortcut then does is `handleShortcutKeydown`'s job — see keyboard.test.ts.
 */
const mount = (keyboardShortcuts = true, editorRoot = createEditorRoot()) => {
  const diagramStore = createDiagramStore()
  const metadataStore = createMetadataStore()
  metadataStore.getState().setKeyboardShortcuts(keyboardShortcuts)
  const overlayStore = createOverlayStore()
  const editorRootRef = {
    current: editorRoot,
  } as RefObject<HTMLElement>

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
    ...renderHook(() => useKeyboardShortcuts(editorRootRef), { wrapper }),
    diagramStore,
    editorRoot,
  }
}

const createEditorRoot = () => {
  const editorRoot = document.createElement("div")
  editorRoot.className = "apollon-editor"
  editorRoot.append(document.createElement("div"))
  document.body.append(editorRoot)
  return editorRoot
}

const selectAll = (target: EventTarget = document.body) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "a",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
  )

describe("useKeyboardShortcuts", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("keeps one listener across re-renders and drops it on unmount", () => {
    const editorRoot = createEditorRoot()
    const add = vi.spyOn(editorRoot, "addEventListener")
    const remove = vi.spyOn(editorRoot, "removeEventListener")

    const { rerender, unmount, diagramStore } = mount(true, editorRoot)
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
    const { editorRoot } = mount(false)
    // `dispatchEvent` is false only once something calls `preventDefault`.
    expect(selectAll(editorRoot.firstElementChild!)).toBe(true)
  })

  it("claims keys inside its editor and leaves the surrounding page alone", () => {
    const { editorRoot } = mount()
    expect(selectAll(editorRoot.firstElementChild!)).toBe(false)
    expect(selectAll(document.body)).toBe(true)
  })

  it("does not let one editor answer for a sibling", () => {
    const first = mount().editorRoot
    const second = mount().editorRoot

    const firstSelectAll = vi.fn()
    first.addEventListener("keydown", firstSelectAll)
    expect(selectAll(second.firstElementChild!)).toBe(false)
    expect(firstSelectAll).not.toHaveBeenCalled()
  })
})
