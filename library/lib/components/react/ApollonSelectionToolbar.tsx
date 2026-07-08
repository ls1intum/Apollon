import { useCallback, useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { NodeToolbar, Position, useStore } from "@xyflow/react"
import { useApollonEditor } from "./context"
import { RegionMount } from "@/overlay/RegionMount"
import { useLabels } from "@/i18n/useLabels"
import type { OverlayControl } from "@/overlay/types"

const POSITION: Record<string, Position> = {
  top: Position.Top,
  bottom: Position.Bottom,
  left: Position.Left,
  right: Position.Right,
}

export type ApollonSelectionToolbarProps = {
  /** Toolbar content — your own buttons/menu. Portaled in, so it keeps host
   *  context (theme, router) and reconciles normally. */
  children: ReactNode
  /** Which side of the selection to anchor to. Default `"top"`. */
  position?: "top" | "bottom" | "left" | "right"
  /** Gap in px between the selection bounding box and the toolbar. Default 8. */
  offset?: number
  /** Stable control id. Default `"apollon:selection-toolbar"`. */
  id?: string
  /** Accessible name for the wrapper. */
  ariaLabel?: string
  /** Wrapper landmark for the host controls. Use `"toolbar"` only when children implement toolbar keyboard behavior. */
  role?: "toolbar" | "group"
}

/** Renders inside React Flow context (via the overlay), so it can read the live
 *  selection and mount a `NodeToolbar` anchored to the selected nodes' bounding
 *  box. Screen-space and constant-size — it does NOT scale with zoom. */
function SelectionToolbarMount({
  el,
  position,
  offset,
  ariaLabel,
  role,
}: {
  el: HTMLElement
  position: Position
  offset: number
  ariaLabel?: string
  role?: "toolbar" | "group"
}) {
  const t = useLabels()
  // Selected node ids joined into a stable string so the selector doesn't churn
  // identity (returning a fresh array every store tick would). Newline-separated
  // because it can't appear in a node id, so the round-trip can't fracture.
  const selected = useStore((s) => {
    const ids: string[] = []
    for (const node of s.nodeLookup.values())
      if (node.selected) ids.push(node.id)
    return ids.join("\n")
  })
  const ids = selected ? selected.split("\n") : []
  const stop = useCallback((event: { stopPropagation: () => void }) => {
    event.stopPropagation()
  }, [])

  return (
    <NodeToolbar
      nodeId={ids}
      isVisible={ids.length > 0}
      position={position}
      offset={offset}
    >
      <div
        className="nodrag nopan nowheel"
        role={role}
        aria-label={ariaLabel ?? t.selectionActions}
        onPointerDown={stop}
        onMouseDown={stop}
        onTouchStart={stop}
        onWheel={stop}
        onKeyDown={stop}
      >
        <RegionMount el={el} />
      </div>
    </NodeToolbar>
  )
}

/**
 * A selection-anchored control group: your controls float just above (or beside)
 * the current selection, follow it as it moves, and stay a constant on-screen
 * size at any zoom. Unlike `on-canvas` chrome (which lives in diagram space and
 * scales), this is screen-space and only appears while something is selected.
 *
 * Compose it as a child of `<Apollon>`. It reserves no room (floats over the
 * canvas) and needs no positioning props beyond the anchor side.
 *
 * ```tsx
 * <Apollon>
 *   <Apollon.Palette />
 *   <Apollon.Zoom />
 *   <Apollon.MiniMap />
 *   <Apollon.SelectionToolbar position="top" ariaLabel="Selection actions">
 *     <button onClick={onDelete}>Delete</button>
 *     <button onClick={onDuplicate}>Duplicate</button>
 *   </Apollon.SelectionToolbar>
 * </Apollon>
 * ```
 */
export function ApollonSelectionToolbar({
  children,
  position = "top",
  offset = 8,
  id = "apollon:selection-toolbar",
  ariaLabel,
  role = "group",
}: ApollonSelectionToolbarProps): ReactNode {
  const editor = useApollonEditor()
  const [host] = useState<HTMLDivElement | null>(() =>
    typeof document !== "undefined" ? document.createElement("div") : null
  )
  const rfPosition = POSITION[position]

  useEffect(() => {
    if (!editor || !host) return
    const control: OverlayControl = {
      id,
      region: "on-canvas",
      selfPositioned: true,
      render: () => (
        <SelectionToolbarMount
          el={host}
          position={rfPosition}
          offset={offset}
          ariaLabel={ariaLabel}
          role={role}
        />
      ),
    }
    return editor.addControl(control)
  }, [editor, host, id, rfPosition, offset, ariaLabel, role])

  return host ? createPortal(children, host) : null
}
