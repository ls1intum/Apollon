import type { CollaborationCursor, CollaborationViewport } from "@/typings"

export const flowToCanvasPosition = (
  cursor: CollaborationCursor,
  viewport: CollaborationViewport
): CollaborationCursor => ({
  x: cursor.x * viewport.zoom + viewport.x,
  y: cursor.y * viewport.zoom + viewport.y,
})
