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
      // Each paste of the same clipboard steps further from the original; a
      // paste that found nothing to insert doesn't consume a step.
      paste: () => {
        const step = pasteCountRef.current + 1
        void pasteElements(step).then((pasted) => {
          if (pasted) pasteCountRef.current = step
        })
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
