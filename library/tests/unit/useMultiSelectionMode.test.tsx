import { describe, it, expect, beforeEach } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { type ReactNode } from "react"
import { ReactFlowProvider, useStoreApi } from "@xyflow/react"
import * as Y from "yjs"
import { MetadataStoreContext } from "@/store/context"
import { createMetadataStore } from "@/store/metadataStore"
import { useMultiSelectionMode } from "@/hooks/useMultiSelectionMode"

describe("useMultiSelectionMode", () => {
  let metadataStore: ReturnType<typeof createMetadataStore>

  const wrapper = ({ children }: { children: ReactNode }) => (
    <MetadataStoreContext value={metadataStore}>
      <ReactFlowProvider>{children}</ReactFlowProvider>
    </MetadataStoreContext>
  )

  /** Renders the hook and hands back the React Flow store it drives. */
  const renderMultiSelectionMode = () =>
    renderHook(
      () => {
        useMultiSelectionMode()
        return useStoreApi()
      },
      { wrapper }
    )

  beforeEach(() => {
    metadataStore = createMetadataStore(new Y.Doc())
  })

  it("forces React Flow's multiSelectionActive while the mode is on", () => {
    const { result } = renderMultiSelectionMode()
    expect(result.current.getState().multiSelectionActive).toBe(false)

    act(() => metadataStore.getState().setMultiSelectionMode(true))
    expect(result.current.getState().multiSelectionActive).toBe(true)

    act(() => metadataStore.getState().setMultiSelectionMode(false))
    expect(result.current.getState().multiSelectionActive).toBe(false)
  })

  it("re-asserts the flag when React Flow's key handler clears it", () => {
    const { result } = renderMultiSelectionMode()
    act(() => metadataStore.getState().setMultiSelectionMode(true))

    // React Flow writes this flag from its own modifier-key handler on every
    // key transition, which would silently break toggle-taps mid-mode.
    act(() => result.current.setState({ multiSelectionActive: false }))
    expect(result.current.getState().multiSelectionActive).toBe(true)
  })
})
