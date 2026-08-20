import { afterEach, describe, expect, it } from "vitest"
import type { ReactNode } from "react"
import { act, renderHook } from "@testing-library/react"
import { createMetadataStore } from "@/store/metadataStore"
import { createPopoverStore } from "@/store/popoverStore"
import { createDiagramStore } from "@/store/diagramStore"
import {
  DiagramStoreContext,
  MetadataStoreContext,
  PopoverStoreContext,
} from "@/store/context"
import { useElementInteractions } from "@/hooks/useElementInteractions"
import * as Y from "yjs"

/**
 * `onBeforeDelete` is the one gate every React Flow deletion funnels through.
 * Besides read-only, it blocks a Delete pressed while focus is in an overlay
 * over the canvas — React Flow's delete listener is document-level, so without
 * this a dialog's Delete would remove the selection behind it.
 */
const wrapper = ({ children }: { children: ReactNode }) => {
  const ydoc = new Y.Doc()
  return (
    <DiagramStoreContext value={createDiagramStore(ydoc)}>
      <MetadataStoreContext value={createMetadataStore(ydoc)}>
        <PopoverStoreContext value={createPopoverStore()}>
          {children}
        </PopoverStoreContext>
      </MetadataStoreContext>
    </DiagramStoreContext>
  )
}

const onBeforeDelete = () =>
  renderHook(() => useElementInteractions(), { wrapper }).result.current
    .onBeforeDelete

const emptyDelete = { nodes: [], edges: [] }

afterEach(() => {
  document.body.innerHTML = ""
})

describe("useElementInteractions.onBeforeDelete", () => {
  it("keeps React Flow callback identities stable across parent renders and diagram changes", () => {
    const metadata = createMetadataStore()
    const popover = createPopoverStore()
    const diagram = createDiagramStore(new Y.Doc())
    const stableWrapper = ({ children }: { children: ReactNode }) => (
      <DiagramStoreContext value={diagram}>
        <MetadataStoreContext value={metadata}>
          <PopoverStoreContext value={popover}>{children}</PopoverStoreContext>
        </MetadataStoreContext>
      </DiagramStoreContext>
    )
    const hook = renderHook(() => useElementInteractions(), {
      wrapper: stableWrapper,
    })
    const first = hook.result.current

    hook.rerender()

    expect(hook.result.current.onBeforeDelete).toBe(first.onBeforeDelete)
    expect(hook.result.current.onNodeClick).toBe(first.onNodeClick)
    expect(hook.result.current.onEdgeClick).toBe(first.onEdgeClick)
    expect(hook.result.current.onNodeDoubleClick).toBe(first.onNodeDoubleClick)
    expect(hook.result.current.onEdgeDoubleClick).toBe(first.onEdgeDoubleClick)

    act(() =>
      diagram
        .getState()
        .setNodes([{ id: "node", position: { x: 0, y: 0 }, data: {} }])
    )

    expect(hook.result.current.onNodeClick).toBe(first.onNodeClick)
    expect(hook.result.current.onEdgeClick).toBe(first.onEdgeClick)
  })

  it("allows deletion on a modifiable diagram with the canvas focused", async () => {
    document.body.innerHTML =
      '<div class="apollon-editor"><button id="n"></button></div>'
    document.querySelector<HTMLElement>("#n")!.focus()

    expect(await onBeforeDelete()(emptyDelete)).toBe(true)
  })

  it("blocks deletion while focus is inside a dialog over the canvas", async () => {
    document.body.innerHTML =
      '<div role="dialog"><button id="ok"></button></div>'
    document.querySelector<HTMLElement>("#ok")!.focus()

    expect(await onBeforeDelete()(emptyDelete)).toBe(false)
  })
})
