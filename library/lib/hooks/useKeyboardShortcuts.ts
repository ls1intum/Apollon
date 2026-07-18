import { useEffect, useRef } from "react"
import { useReactFlow } from "@xyflow/react"
import {
  useDiagramStore,
  useMetadataStore,
  useOverlayStore,
} from "@/store/context"
import { useShallow } from "zustand/shallow"
import { useSelectionForCopyPaste } from "./useSelectionForCopyPaste"
import { useDiagramModifiable } from "./useDiagramModifiable"
import { insetAwareFitView } from "@/overlay/fitView"
import { handleShortcutKeydown, type KeyboardShortcutDeps } from "@/keyboard"

/**
 * Wires `APOLLON_SHORTCUTS` to the store, the clipboard helpers and the
 * viewport. Registered on `document`, so shortcuts work without the canvas
 * holding focus — which assumes one editor per page; two would both react, so a
 * host mounting several passes `keyboardShortcuts: false` to all but one.
 * Registered once: the actions close over `nodes`/`edges`, so a dependency on
 * them would re-register the listener on every drag frame.
 */
export const useKeyboardShortcuts = () => {
  const pasteCountRef = useRef(0)
  // Serializes a burst of pastes so their copies cascade in order.
  const pasteChainRef = useRef<Promise<unknown>>(Promise.resolve())

  const { undo, redo } = useDiagramStore(
    useShallow((state) => ({ undo: state.undo, redo: state.redo }))
  )
  const setMultiSelectionMode = useMetadataStore(
    (state) => state.setMultiSelectionMode
  )
  const isDiagramModifiable = useDiagramModifiable()
  const enabled = useMetadataStore((state) => state.keyboardShortcuts)
  const rf = useReactFlow()
  const { insets, safeArea } = useOverlayStore(
    useShallow((state) => ({ insets: state.insets, safeArea: state.safeArea }))
  )
  const {
    hasSelectedElements,
    selectAll,
    clearSelection,
    copySelectedElements,
    pasteElements,
    duplicateSelectedElements,
    cutSelectedElements,
  } = useSelectionForCopyPaste()

  const deps: KeyboardShortcutDeps = {
    isDiagramModifiable: () => isDiagramModifiable,
    actions: {
      "select-all": selectAll,
      // Escape also drops out of touch multi-select mode.
      "clear-selection": () => {
        setMultiSelectionMode(false)
        clearSelection()
      },
      // Nothing selected means nothing to copy, so leave Mod+C/Mod+X to the
      // browser rather than swallowing a copy of whatever text is selected.
      copy: () => {
        if (!hasSelectedElements()) return false
        pasteCountRef.current = 0
        void copySelectedElements()
      },
      cut: () => {
        if (!hasSelectedElements()) return false
        pasteCountRef.current = 0
        void cutSelectedElements()
      },
      // Reserve the next cascade slot synchronously, then serialize: two quick
      // presses take steps N and N+1 (not both N), and each paste runs after the
      // previous so the copies land in order. `insertClipboardData` reads live
      // store state, so a later paste builds on the earlier one either way — the
      // chain just keeps the offsets ordered. A failed paste leaves its slot
      // unused (a harmless gap the next copy resets).
      paste: () => {
        pasteCountRef.current += 1
        const step = pasteCountRef.current
        pasteChainRef.current = pasteChainRef.current
          .then(() => pasteElements(step))
          .catch(() => {})
      },
      // Duplicating a just-pasted element lands it on the next paste's slot, so
      // consume that step rather than stack the two. Always claims the key:
      // Mod+D's browser default is "add bookmark", never what's wanted here.
      duplicate: () => {
        if (duplicateSelectedElements()) pasteCountRef.current += 1
      },
      undo,
      redo,
      "zoom-in": () => void rf.zoomIn(),
      "zoom-out": () => void rf.zoomOut(),
      "reset-zoom": () => void rf.zoomTo(1),
      "fit-view": () => insetAwareFitView(rf, insets, safeArea),
      "zoom-to-selection": () => {
        const framed = new Set(
          rf
            .getNodes()
            .filter((node) => node.selected)
            .map((node) => node.id)
        )
        for (const edge of rf.getEdges()) {
          if (!edge.selected) continue
          framed.add(edge.source)
          framed.add(edge.target)
        }
        insetAwareFitView(
          rf,
          insets,
          safeArea,
          // Nothing selected frames everything.
          framed.size > 0
            ? { nodes: [...framed].map((id) => ({ id })) }
            : undefined
        )
      },
    },
  }

  const depsRef = useRef(deps)
  useEffect(() => {
    depsRef.current = deps
  })

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) =>
      handleShortcutKeydown(event, depsRef.current)
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [enabled])
}
