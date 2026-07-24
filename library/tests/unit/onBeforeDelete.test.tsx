import { afterEach, describe, expect, it } from "vitest"
import type { ReactNode } from "react"
import { renderHook } from "@testing-library/react"
import { createMetadataStore } from "@/store/metadataStore"
import { createPopoverStore } from "@/store/popoverStore"
import { MetadataStoreContext, PopoverStoreContext } from "@/store/context"
import { useElementInteractions } from "@/hooks/useElementInteractions"

/**
 * `onBeforeDelete` is the one gate every React Flow deletion funnels through.
 * Besides read-only, it blocks a Delete pressed while focus is in an overlay
 * over the canvas — React Flow's delete listener is document-level, so without
 * this a dialog's Delete would remove the selection behind it.
 */
const wrapper = ({ children }: { children: ReactNode }) => (
  <MetadataStoreContext value={createMetadataStore()}>
    <PopoverStoreContext value={createPopoverStore()}>
      {children}
    </PopoverStoreContext>
  </MetadataStoreContext>
)

const onBeforeDelete = () =>
  renderHook(() => useElementInteractions(), { wrapper }).result.current
    .onBeforeDelete

const emptyDelete = { nodes: [], edges: [] }

afterEach(() => {
  document.body.innerHTML = ""
})

describe("useElementInteractions.onBeforeDelete", () => {
  it("keeps React Flow callback identities stable across parent renders", () => {
    const metadata = createMetadataStore()
    const popover = createPopoverStore()
    const stableWrapper = ({ children }: { children: ReactNode }) => (
      <MetadataStoreContext value={metadata}>
        <PopoverStoreContext value={popover}>{children}</PopoverStoreContext>
      </MetadataStoreContext>
    )
    const hook = renderHook(() => useElementInteractions(), {
      wrapper: stableWrapper,
    })
    const first = hook.result.current

    hook.rerender()

    expect(hook.result.current.onBeforeDelete).toBe(first.onBeforeDelete)
    expect(hook.result.current.onNodeDoubleClick).toBe(first.onNodeDoubleClick)
    expect(hook.result.current.onEdgeDoubleClick).toBe(first.onEdgeDoubleClick)
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
