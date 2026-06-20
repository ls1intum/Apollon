import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useEditorContext } from "@/contexts"
import { Navbar } from "./Navbar"

/**
 * Mounts the editor navbar as immersive in-canvas chrome. The navbar is
 * portaled into the library's `header` overlay region, so the canvas is
 * full-bleed beneath it and the diagram automatically makes room (the region
 * reserves its measured height as a top inset). createPortal keeps the navbar in
 * the webapp React tree, so it retains theme tokens, the router and all app
 * contexts; only its DOM lands inside the canvas.
 *
 * Rendered once for editor routes (from the root layout). Returns null until an
 * editor instance exists in EditorContext.
 */
export function EditorChromeHeader() {
  const { editor } = useEditorContext()
  const [host, setHost] = useState<HTMLElement | null>(null)

  // Acquire the stable header host node once per editor (registering the control
  // is a side effect, so it belongs in an effect, not render). This is a
  // one-shot external-resource acquisition, not a render cascade.
  useEffect(() => {
    if (!editor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHost(null)
      return
    }
    const el = editor.getRegionElement("header")
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHost(el)
    return () => {
      editor.releaseRegionElement("header")
    }
  }, [editor])

  return host ? createPortal(<Navbar />, host) : null
}
