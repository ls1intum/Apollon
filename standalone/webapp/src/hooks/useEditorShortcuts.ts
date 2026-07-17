import { useEffect, useRef } from "react"
import {
  isInsideOverlay,
  isTypingTarget,
  matchesShortcutCombo,
  type ApollonShortcutCombo,
} from "@tumaet/apollon"
import { toast } from "react-toastify"
import { useVersionStore } from "@/stores/useVersionStore"
import { useExportAsJSON } from "./useExportAsJSON"
import { log } from "@/logger"

export type EditorShortcutId =
  | "save-as-json"
  | "save-version"
  | "toggle-version-history"

interface EditorShortcut {
  id: EditorShortcutId
  combo: ApollonShortcutCombo
  /**
   * Fires even from a text field or an open dialog. Only saving earns it: an
   * unhandled Mod+S means the browser's save-page dialog opens over the
   * diagram, whatever the user was doing.
   */
  anywhere?: true
}

/**
 * The shortcuts above the diagram — the library owns everything on the canvas.
 * The How-to-use sheet renders its File group from this same list.
 */
export const EDITOR_SHORTCUTS: readonly EditorShortcut[] = [
  { id: "save-as-json", combo: { key: "s", mod: true }, anywhere: true },
  { id: "save-version", combo: { key: "s", mod: true, shift: true } },
  // Matched on `code`: Alt rewrites `key` on macOS, where ⌥⇧H reports "˙".
  {
    id: "toggle-version-history",
    combo: { code: "KeyH", alt: true, shift: true },
  },
]

export const createEditorShortcutHandler =
  (actions: Record<EditorShortcutId, () => void>) => (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing) return
    for (const shortcut of EDITOR_SHORTCUTS) {
      if (!matchesShortcutCombo(event, shortcut.combo)) continue
      // Opening the version drawer under a dialog, or out from under someone
      // mid-sentence, is never what they meant.
      if (
        !shortcut.anywhere &&
        (isTypingTarget(event) || isInsideOverlay(event))
      )
        return
      event.preventDefault()
      if (event.repeat) return
      actions[shortcut.id]()
      return
    }
  }

export function useEditorShortcuts(diagramId: string | undefined) {
  const openDrawer = useVersionStore((s) => s.openDrawer)
  const closeDrawer = useVersionStore((s) => s.closeDrawer)
  const requestSave = useVersionStore((s) => s.requestSave)
  const exportAsJSON = useExportAsJSON()

  // `useExportAsJSON` returns a fresh closure every render; the listener reads
  // the latest through a ref rather than re-registering.
  const exportRef = useRef(exportAsJSON)
  useEffect(() => {
    exportRef.current = exportAsJSON
  })

  useEffect(() => {
    if (!diagramId) return
    const onKeyDown = createEditorShortcutHandler({
      "save-as-json": () => {
        toast
          .promise(exportRef.current(), {
            pending: "Exporting JSON…",
            success: "JSON exported.",
            error: "JSON export failed. Please try again.",
          })
          .catch((err) => {
            // toast.promise already surfaced the error; keep a log for triage.
            log.error("save shortcut export failed", err as Error)
          })
      },
      // Opens the panel and asks it to save — the panel owns the editor model
      // and the dirty-check, so it saves only when there's something new.
      "save-version": () => requestSave(diagramId),
      "toggle-version-history": () => {
        const open = useVersionStore.getState().drawerOpenByDiagram[diagramId]
        if (open) closeDrawer(diagramId)
        else openDrawer(diagramId)
      },
    })
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [diagramId, openDrawer, closeDrawer, requestSave])
}
