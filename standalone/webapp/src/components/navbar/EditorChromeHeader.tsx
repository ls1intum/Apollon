import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import useMediaQuery from "@mui/material/useMediaQuery"
import { useEditorContext } from "@/contexts"
import { MOBILE_VIEW_QUERY } from "@/constants"
import {
  HeaderBrandIsland,
  HeaderTitleIsland,
  HeaderActionsIsland,
} from "./HeaderIslands"
import { MobileBrandPill, MobileActionsPill } from "./MobileIslands"

// Derive the editor type from the context so it matches by construction (the
// library ships two ApollonEditor declarations — main + react peer build — whose
// private members aren't assignable to each other).
type Editor = ReturnType<typeof useEditorContext>["editor"]
type Region = Parameters<NonNullable<Editor>["getRegionElement"]>[0]

/**
 * Acquires a stable host node for an overlay region while `active`, releasing it
 * otherwise. The host node lives for the editor instance, so a `createPortal`
 * target stays valid; switching desktop⇆mobile releases the unused regions.
 */
function useRegionHost(editor: Editor, region: Region, active: boolean) {
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

/**
 * Mounts the editor header as floating glass islands over a full-bleed canvas.
 * Desktop: brand+nav top-left, title top-center, actions top-right. Mobile: a
 * brand+back pill top-left and an overflow pill top-right (title in the menu).
 * createPortal keeps each island in the webapp React tree (theme, router, app
 * contexts intact); only its DOM lands in the canvas region.
 */
export function EditorChromeHeader() {
  const { editor } = useEditorContext()
  const isMobile = useMediaQuery(MOBILE_VIEW_QUERY)

  const leftHost = useRegionHost(editor, "top-left", true)
  const centerHost = useRegionHost(editor, "top-center", !isMobile)
  const rightHost = useRegionHost(editor, "top-right", true)

  return (
    <>
      {leftHost &&
        createPortal(
          isMobile ? <MobileBrandPill /> : <HeaderBrandIsland />,
          leftHost
        )}
      {centerHost && createPortal(<HeaderTitleIsland />, centerHost)}
      {rightHost &&
        createPortal(
          isMobile ? <MobileActionsPill /> : <HeaderActionsIsland />,
          rightHost
        )}
    </>
  )
}
