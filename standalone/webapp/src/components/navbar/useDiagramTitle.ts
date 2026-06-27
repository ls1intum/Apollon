import { useEffect, useRef, useState } from "react"
import { useEditorContext } from "@/contexts"

/**
 * Container hook for the editor's diagram-title field: owns the impure wiring
 * (the editor-store subscription + the write-back) and hands back a plain
 * controlled `value`/`onValueChange` pair for {@link HeaderTitleField}.
 *
 * Subscribes to the editor's diagram-name changes and seeds the initial value
 * on (re)mount / editor swap; `onValueChange` writes through to the editor store
 * and mirrors locally so the field stays responsive.
 */
export function useDiagramTitle() {
  const { editor } = useEditorContext()
  const [title, setTitle] = useState(
    editor?.getDiagramMetadata().diagramTitle || ""
  )
  const subId = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!editor) return
    subId.current = editor.subscribeToDiagramNameChange((t) => setTitle(t))
    // Initial read from the editor store on (re)mount / editor swap.
    setTitle(editor.getDiagramMetadata().diagramTitle || "")
    return () => {
      if (subId.current !== undefined) editor.unsubscribe(subId.current)
    }
  }, [editor])

  const onValueChange = (next: string) => {
    editor?.updateDiagramTitle(next)
    setTitle(next)
  }

  return { value: title, onValueChange }
}
