import { useEffect } from "react"
import { useOverlayStore } from "@/store/context"
import { Sidebar } from "@/components/Sidebar"
import { ZoomControls } from "./builtins/ZoomControls"

/**
 * Registers the editor's own built-in controls through the same overlay engine
 * that host controls use — so the palette and zoom cluster participate in the
 * one collision-free, inset-aware layout instead of each bringing its own
 * positioning model. They are ordinary registered controls under reserved ids;
 * a host can already see them via `hasControl`, and Phase 2 lets consumers
 * hide / move / replace them through the public `controls` config.
 *
 * Reserved ids (never collide with host `addControl` ids, which are host-chosen):
 *   apollon:palette  → left rail, visible only while modelling & editable
 *   apollon:zoom     → bottom-left zoom / history cluster
 *
 * Rendered INSIDE `<ReactFlow>` so the registered render thunks resolve React
 * Flow + store context exactly like every other control.
 */
export const PALETTE_CONTROL_ID = "apollon:palette"
export const ZOOM_CONTROL_ID = "apollon:zoom"

export function BuiltInControls({ showPalette }: { showPalette: boolean }) {
  const register = useOverlayStore((s) => s.register)
  const unregister = useOverlayStore((s) => s.unregister)

  // Zoom cluster: register once; unregister on unmount.
  useEffect(() => {
    register({
      id: ZOOM_CONTROL_ID,
      region: "bottom-left",
      inset: "auto",
      order: 0,
      render: () => <ZoomControls />,
    })
    return () => unregister(ZOOM_CONTROL_ID)
  }, [register, unregister])

  // Palette: (re-)register on visibility change. `register` REPLACES by id (it
  // never removes), so toggling `visible` re-frames the control in place without
  // an unregister/re-register flash that would remount + re-measure the palette.
  useEffect(() => {
    register({
      id: PALETTE_CONTROL_ID,
      region: "left-rail",
      inset: "auto",
      order: 0,
      visible: showPalette,
      render: () => <Sidebar />,
    })
  }, [register, showPalette])

  // Unregister the palette only on unmount (not on every visibility toggle).
  useEffect(() => () => unregister(PALETTE_CONTROL_ID), [unregister])

  return null
}
