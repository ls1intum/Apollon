import { createPortal } from "react-dom"
import { Capacitor } from "@capacitor/core"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { useEditorContext } from "@/contexts"
import { useRegionHost } from "@/hooks/useRegionHost"
import { NARROW_VIEW_QUERY } from "@/constants"
import { EditorHeaderRow } from "./HeaderIslands"

/**
 * Mounts the editor header into the library's single full-width `header` overlay
 * band as one fluid flex row: `[brand/back] [title — flex] [actions]`. A shared
 * flex track means the centered title can grow with the name and then shrink
 * (ellipsis) but never overlap its neighbours, and the gaps stay constant — the
 * three-independent-Panels layout could not guarantee either. createPortal keeps
 * the row in the webapp React tree (theme, router, contexts); only its DOM lands
 * in the canvas band.
 *
 * Responsive: `isNarrow` (portrait phones) collapses to compact pills with an
 * overflow menu; wider viewports (incl. phone-landscape) keep the full island
 * bar. The brand logo is hidden on narrow AND on native (Capacitor) — there the
 * wordmark is noise, so the left cluster is just an always-present back control.
 */
export function EditorChromeHeader() {
  const { editor } = useEditorContext()
  const isNarrow = useMediaQuery(NARROW_VIEW_QUERY)
  const isNative = Capacitor.isNativePlatform()
  const headerHost = useRegionHost(editor, "header", true)

  if (!headerHost) return null
  return createPortal(
    <EditorHeaderRow isNarrow={isNarrow} hideBrand={isNarrow || isNative} />,
    headerHost
  )
}
