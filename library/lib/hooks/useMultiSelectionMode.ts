import { useEffect } from "react"
import { useStoreApi } from "@xyflow/react"
import { useMetadataStore } from "@/store/context"

/**
 * Reproduces Shift/Ctrl multi-selection while `multiSelectionMode` is on, for
 * pointers that have no modifier key (touch). React Flow has no public prop for
 * "a modifier is held" — `multiSelectionKeyCode` needs a real key — so the
 * internal flag its click paths read is the only lever. React Flow's key handler
 * rewrites that flag on every modifier transition, hence the re-asserting
 * subscription rather than a one-shot write.
 *
 * Being internal, the flag could be renamed in any React Flow release: this
 * hook's unit test asserts it against a real store, so a rename fails CI on the
 * catalog bump instead of silently leaving the toggle inert.
 */
export const useMultiSelectionMode = (): boolean => {
  const multiSelectionMode = useMetadataStore(
    (state) => state.multiSelectionMode
  )
  const store = useStoreApi()

  useEffect(() => {
    if (!multiSelectionMode) return

    store.setState({ multiSelectionActive: true })
    const unsubscribe = store.subscribe((state) => {
      if (!state.multiSelectionActive) {
        store.setState({ multiSelectionActive: true })
      }
    })

    return () => {
      unsubscribe()
      store.setState({ multiSelectionActive: false })
    }
  }, [multiSelectionMode, store])

  return multiSelectionMode
}
