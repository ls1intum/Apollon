import { useEffect, useRef } from "react"
import { useDiagramStore, useMetadataStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { useSelectionForCopyPaste } from "./useSelectionForCopyPaste"
import { useDiagramModifiable } from "./useDiagramModifiable"

export const useKeyboardShortcuts = () => {
  const pasteCountRef = useRef(0)

  const { undo, redo, canUndo, canRedo, undoManager } = useDiagramStore(
    useShallow((state) => ({
      undo: state.undo,
      redo: state.redo,
      canUndo: state.canUndo,
      canRedo: state.canRedo,
      undoManager: state.undoManager,
    }))
  )
  const setMultiSelectionMode = useMetadataStore(
    (state) => state.setMultiSelectionMode
  )
  const isDiagramModifiable = useDiagramModifiable()
  const {
    selectedElementIds,
    hasSelectedElements,
    selectAll,
    clearSelection,
    copySelectedElements,
    pasteElements,
    cutSelectedElements,
    deleteSelectedElements,
  } = useSelectionForCopyPaste()

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      // Check if we're in an input field or textarea
      const target = event.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return
      }

      if (event.key === "Escape") {
        event.preventDefault()
        setMultiSelectionMode(false)
        clearSelection()
        return
      }

      if (event.key === "Delete") {
        if (!isDiagramModifiable) return
        event.preventDefault()
        if (hasSelectedElements()) {
          deleteSelectedElements()
        }
        return
      }

      const isModifierPressed = event.ctrlKey || event.metaKey

      if (!isModifierPressed) return

      if (!isDiagramModifiable) return

      switch (event.key.toLowerCase()) {
        case "z":
          event.preventDefault()
          if (event.shiftKey) {
            redo()
          } else {
            undo()
          }
          break

        case "y":
          if (!event.shiftKey) {
            event.preventDefault()
            redo()
          }
          break

        case "a":
          if (!event.shiftKey && !event.altKey) {
            event.preventDefault()
            selectAll()
          }
          break

        case "c":
          if (!event.shiftKey && !event.altKey) {
            event.preventDefault()
            if (hasSelectedElements()) {
              pasteCountRef.current = 0
              copySelectedElements()
            }
          }
          break

        case "x":
          if (!event.shiftKey && !event.altKey) {
            event.preventDefault()
            if (hasSelectedElements()) {
              pasteCountRef.current = 0
              cutSelectedElements()
            }
          }
          break

        case "v":
          if (!event.shiftKey && !event.altKey) {
            event.preventDefault()
            pasteCountRef.current += 1
            pasteElements(pasteCountRef.current)
          }
          break

        case "d":
          if (!event.shiftKey && !event.altKey) {
            event.preventDefault()
            clearSelection()
          }
          break

        default:
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [
    undo,
    redo,
    canUndo,
    canRedo,
    undoManager,
    selectedElementIds,
    hasSelectedElements,
    selectAll,
    clearSelection,
    copySelectedElements,
    cutSelectedElements, // Add this to dependencies
    pasteElements,
    setMultiSelectionMode,
  ])
}
