import type { CollaborationViewport } from "@/typings"

type Point = { x: number; y: number }

// Maps a point from flow coordinates to canvas-local pixels — the same
// translate-then-scale the React Flow pane applies (`flow * zoom + pan`).
//
// This is deliberately NOT `flowToScreenPosition`: cursors render in a
// `position: absolute` layer inside `.apollon-canvas`, so they must be placed
// relative to the canvas, not the browser window. Screen coordinates add the
// editor's on-screen offset, which differs per collaborator (host chrome,
// window size) and pushes remote cursors out of place — the bug this fixes.
export const flowToCanvasPosition = (
  point: Point,
  viewport: CollaborationViewport
): Point => ({
  x: point.x * viewport.zoom + viewport.x,
  y: point.y * viewport.zoom + viewport.y,
})
