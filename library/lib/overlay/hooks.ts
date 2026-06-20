import { useViewport } from "@xyflow/react"
import { useOverlayStore } from "../store/context"
import { type Insets, type OverlayBreakpoint } from "./types"

/**
 * The live content-inset rect reserved by overlay chrome (header, rails, …).
 * Use it to keep custom canvas content clear of the chrome. Only valid for
 * components rendered inside the editor (under the Apollon providers).
 */
export function useApollonInsets(): Insets {
  return useOverlayStore((s) => s.insets)
}

/** The current container-derived breakpoint (not the window's). */
export function useApollonBreakpoint(): OverlayBreakpoint {
  return useOverlayStore((s) => s.breakpoint)
}

/** The live React Flow viewport `{ x, y, zoom }`. */
export function useApollonViewport(): { x: number; y: number; zoom: number } {
  return useViewport()
}
