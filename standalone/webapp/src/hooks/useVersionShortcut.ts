import { useEffect } from "react"
import { useVersionStore } from "@/stores/useVersionStore"

/**
 * ⌥⇧H / Alt+Shift+H toggles the version-history drawer.
 * ⌘⇧S / Ctrl+Shift+S opens the inline create form (same as opening the drawer
 * for now — the drawer auto-focuses the input).
 */
const isMac = /mac/i.test(navigator.userAgent)

export function useVersionShortcut(diagramId: string | undefined) {
  const openDrawer = useVersionStore((s) => s.openDrawer)
  const closeDrawer = useVersionStore((s) => s.closeDrawer)

  useEffect(() => {
    if (!diagramId) return
    const handler = (e: KeyboardEvent) => {
      const meta = isMac ? e.metaKey : e.ctrlKey
      if (e.altKey && e.shiftKey && e.code === "KeyH") {
        e.preventDefault()
        const open = useVersionStore.getState().drawerOpenByDiagram[diagramId]
        if (open) closeDrawer(diagramId)
        else openDrawer(diagramId)
        return
      }
      if (meta && e.shiftKey && e.code === "KeyS") {
        e.preventDefault()
        openDrawer(diagramId)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [diagramId, openDrawer, closeDrawer])
}
