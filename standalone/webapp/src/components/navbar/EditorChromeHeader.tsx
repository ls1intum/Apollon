import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import useMediaQuery from "@mui/material/useMediaQuery"
import { useEditorContext } from "@/contexts"
import { MOBILE_VIEW_QUERY } from "@/constants"
import MobileNavbar from "./MobileNavbar"
import {
  HeaderBrandIsland,
  HeaderTitleIsland,
  HeaderActionsIsland,
} from "./HeaderIslands"

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
 * Mounts the editor header as immersive in-canvas chrome. On desktop it is three
 * floating glass islands (brand+nav top-left, title top-center, actions
 * top-right) portaled into the matching overlay regions so they hover over a
 * full-bleed canvas and the diagram makes room for each via its measured inset.
 * On mobile it stays a single compact bar in the full-width `header` band.
 *
 * createPortal keeps every island in the webapp React tree, so they retain theme
 * tokens, the router and all app contexts; only their DOM lands in the canvas.
 */
export function EditorChromeHeader() {
  const { editor } = useEditorContext()
  const isMobile = useMediaQuery(MOBILE_VIEW_QUERY)

  const headerHost = useRegionHost(editor, "header", isMobile)
  const leftHost = useRegionHost(editor, "top-left", !isMobile)
  const centerHost = useRegionHost(editor, "top-center", !isMobile)
  const rightHost = useRegionHost(editor, "top-right", !isMobile)

  return (
    <>
      {headerHost && createPortal(<MobileNavbar />, headerHost)}
      {leftHost && createPortal(<HeaderBrandIsland />, leftHost)}
      {centerHost && createPortal(<HeaderTitleIsland />, centerHost)}
      {rightHost && createPortal(<HeaderActionsIsland />, rightHost)}
    </>
  )
}
