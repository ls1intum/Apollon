import { useEffect } from "react"
import { useVersionStore } from "@/stores/useVersionStore"

/**
 * ⌥⇧H / Alt+Shift+H toggles the version-history drawer.
 * ⌘⇧S / Ctrl+Shift+S opens the inline create form (same as opening the drawer
 * for now — the drawer auto-focuses the input).
 */
export function useVersionShortcut(diagramId: string | undefined) {
  const openDrawer = useVersionStore((s) => s.openDrawer)
  const closeDrawer = useVersionStore((s) => s.closeDrawer)
  const isOpen = useVersionStore((s) =>
    Boolean(diagramId && s.drawerOpenByDiagram[diagramId])
  )

  useEffect(() => {
    if (!diagramId) return
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac")
      const meta = isMac ? e.metaKey : e.ctrlKey
      // ⌥⇧H / Alt+Shift+H — toggle drawer.
      if (e.altKey && e.shiftKey && e.code === "KeyH") {
        e.preventDefault()
        if (isOpen) closeDrawer(diagramId)
        else openDrawer(diagramId)
        return
      }
      // ⌘⇧S / Ctrl+Shift+S — open drawer (focuses the inline create form).
      if (meta && e.shiftKey && e.code === "KeyS") {
        e.preventDefault()
        openDrawer(diagramId)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [diagramId, isOpen, openDrawer, closeDrawer])
}
