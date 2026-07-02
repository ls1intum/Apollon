import { useEffect } from "react"
import { useOverlayStore } from "@/store/context"
import {
  MINIMAP_ID,
  PALETTE_ID,
  ZOOM_ID,
  miniMapControl,
  paletteControl,
  zoomControl,
} from "./builtins/controls"

interface DefaultControlsProps {
  /** Register the defaults at all — false once the consumer owns the chrome. */
  enabled: boolean
  /** The palette is modelling-only; gate it beneath the defaults. */
  showPalette: boolean
}

/**
 * Registers the editor's default chrome — the zoom cluster, the minimap, and (in
 * modelling) the element palette — into the overlay registry, the same records a
 * consumer would build with the built-in factories. Disabled the moment the
 * consumer supplies their own `controls` or composes `<Apollon>` children, so the
 * defaults never fight a custom layout.
 */
export function DefaultControls({
  enabled,
  showPalette,
}: DefaultControlsProps): null {
  const register = useOverlayStore((s) => s.register)
  const unregister = useOverlayStore((s) => s.unregister)

  useEffect(() => {
    if (!enabled) return
    register(zoomControl())
    register(miniMapControl())
    return () => {
      unregister(ZOOM_ID)
      unregister(MINIMAP_ID)
    }
  }, [enabled, register, unregister])

  useEffect(() => {
    if (!enabled || !showPalette) return
    register(paletteControl())
    return () => unregister(PALETTE_ID)
  }, [enabled, showPalette, register, unregister])

  return null
}
