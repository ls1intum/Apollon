import { useEffect } from "react"
import { useApollonEditor } from "./context"
import type { OverlayControlInput } from "../../overlay/types"
import {
  miniMapControl,
  paletteControl,
  zoomControl,
  type BuiltInPlacement,
  type MiniMapControlOptions,
  type ZoomControlOptions,
} from "../../chrome/builtins/controls"

/**
 * Register an overlay control for the component's lifetime, re-applying when
 * `deps` change and disposing on unmount (react-map-gl's `useControl` shape). The
 * built-in `render` runs inside the editor's overlay layer, so it resolves React
 * Flow + store context regardless of where the component sits in the consumer's
 * tree.
 *
 * `deps` gate re-registration, so — exactly as with `useMemo`/`useEffect` — they
 * MUST list every value `make`'s returned `render` closes over, or the control
 * keeps rendering stale values. Unlike `<ApollonControl>` (which portals children
 * that reconcile on their own), here the closure IS the content, so the dep list
 * is the only update signal.
 */
export function useControl(
  make: () => OverlayControlInput,
  deps: readonly unknown[]
): void {
  const editor = useApollonEditor()
  useEffect(() => {
    if (!editor) return
    return editor.addControl(make())
    // `make` closes over the current props; `deps` gate re-registration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, ...deps])
}

/** Stable dependency key for a placement object (no functions to serialize). */
const key = (o: object): string => JSON.stringify(o)

/**
 * Compose the editor's built-in chrome as children of `<Apollon>`: presence
 * renders it, omission hides it, and its typed props reconfigure it. Replacing a
 * built-in is just rendering your own `<ApollonControl>` at the reserved id. All
 * three register through the one overlay registry, identical to the vanilla
 * `paletteControl()/zoomControl()/miniMapControl()` descriptors.
 */
export function ApollonPalette(props: BuiltInPlacement = {}): null {
  useControl(() => paletteControl(props), [key(props)])
  return null
}

export function ApollonZoom({
  history,
  ...placement
}: ZoomControlOptions = {}): null {
  useControl(
    () => zoomControl({ history, ...placement }),
    [history, key(placement)]
  )
  return null
}

export function ApollonMiniMap({
  pannable,
  zoomable,
  ...placement
}: MiniMapControlOptions = {}): null {
  useControl(
    () => miniMapControl({ pannable, zoomable, ...placement }),
    [pannable, zoomable, key(placement)]
  )
  return null
}
