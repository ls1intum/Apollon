import { useEffect, useState } from "react"
import { useEditorContext } from "@/contexts"

// Derived from the context so the editor type matches by construction (the
// library ships two ApollonEditor declarations — main + react peer build — whose
// private members aren't assignable to each other).
type Editor = ReturnType<typeof useEditorContext>["editor"]
type Region = Parameters<NonNullable<Editor>["getRegionElement"]>[0]

/**
 * Acquires a stable host node for an overlay region while `active`, releasing it
 * otherwise. The node lives for the editor instance, so a `createPortal` target
 * mounted into it stays valid until `active` flips back off.
 */
export function useRegionHost(
  editor: Editor,
  region: Region,
  active: boolean
): HTMLElement | null {
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (!editor || !active) {
      setHost(null)
      return
    }
    setHost(editor.getRegionElement(region))
    return () => editor.releaseRegionElement(region)
  }, [editor, region, active])
  return host
}
