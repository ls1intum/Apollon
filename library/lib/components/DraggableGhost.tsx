import React, { useEffect, useRef, useState } from "react"
import { DROPS, DropElementConfig, ZINDEX } from "@/constants"
import { createPortal } from "react-dom"
import { useReactFlow, type XYPosition } from "@xyflow/react"
import { useMetadataStore } from "@/store/context"
import { resolveApollonThemeVars } from "@/components/ui/portalTheme"
import { useApollonPortalContainer } from "@/components/ui/portalContainer"
import { useShallow } from "zustand/shallow"
import { usePalettePlacement } from "@/hooks/usePalettePlacement"

/* ========================================================================
   Page-scroll lock during a palette drag.

   The editor is a library embedded in arbitrary host pages, so we save the
   host's existing `body` styles and restore them verbatim — resetting to ""
   would silently clobber a host that intentionally runs with, say,
   `body { overflow: hidden }`. Only one palette item can be dragged at a
   time (one pointer), so module-level saved state is safe.
   ======================================================================== */
let savedBodyOverflow = ""
let savedBodyTouchAction = ""

const disableScroll = () => {
  savedBodyOverflow = document.body.style.overflow
  savedBodyTouchAction = document.body.style.touchAction
  document.body.style.overflow = "hidden"
  document.body.style.touchAction = "none"
}

const enableScroll = () => {
  document.body.style.overflow = savedBodyOverflow
  document.body.style.touchAction = savedBodyTouchAction
}

/** The palette's painted theme, carried onto the `<body>`-portaled ghost. */
interface GhostTheme {
  vars: React.CSSProperties
  dataTheme?: string
}

interface DraggableGhostProps {
  children: React.ReactNode
  dropElementConfig: DropElementConfig
  /**
   * Visual scale of the palette preview.
   * Used to convert pointer offsets into node-placement offsets.
   */
}

export const DraggableGhost: React.FC<DraggableGhostProps> = ({
  children,
  dropElementConfig,
}) => {
  const { getViewport } = useReactFlow()
  const { dropAtPointer, placeAtViewportCenter } =
    usePalettePlacement(dropElementConfig)
  const { addElementLabel, nodeTypeLabel } = useMetadataStore(
    useShallow((state) => ({
      addElementLabel: state.labels.addElement,
      nodeTypeLabel: state.labels.nodeTypeLabel,
    }))
  )
  const portalContainer = useApollonPortalContainer()

  const ghostDropWidth = dropElementConfig.dropWidth ?? dropElementConfig.width
  const ghostDropHeight =
    dropElementConfig.dropHeight ?? dropElementConfig.height

  const [isDragging, setIsDragging] = useState(false)
  const [ghostPosition, setGhostPosition] = useState({ x: 0, y: 0 })
  // Cursor offset within the ENTRY, which is what the ghost renders. Differs from
  // the preview offset because the entry flex-centres its preview; positioning
  // the ghost by the preview offset would re-apply that centring and jump.
  const [ghostOffset, setGhostOffset] = useState({ x: 0, y: 0 })
  // Drawn at the node's final on-screen size rather than drawn small and scaled: a
  // CSS transform rasterises the SVG at preview size and stretches the bitmap, so
  // the ghost comes off the palette pixelated and worse the further the canvas is
  // zoomed. Captured on grab; zoom cannot change mid palette-drag.
  const [ghostRender, setGhostRender] = useState({ scale: 1 })
  // The theme the palette entry was painted under, captured on grab. The ghost
  // portals to `document.body`, leaving the subtree that scopes `--apollon-*`.
  // Both halves are needed: the resolved token VALUES cover a mount themed by
  // inline custom properties or by a host stylesheet (VS Code), and `data-theme`
  // re-matches the attribute selectors in the editor's own CSS. A drag is
  // transient, so a one-shot capture is enough — no observer.
  const [ghostTheme, setGhostTheme] = useState<GhostTheme>({ vars: {} })

  // Gesture bookkeeping. Refs, not state: read by the document listeners and the
  // click handler without re-rendering or re-binding.
  const startRef = useRef<XYPosition | null>(null)
  const maxTravelRef = useRef(0)
  const pointerTypeRef = useRef<string>("mouse")
  // Cursor offset within the PREVIEW shape, backed out on drop so the grabbed
  // point stays under the pointer.
  const grabFractionRef = useRef<XYPosition>({ x: 0, y: 0 })
  // True once a press has turned into a drag, so the trailing click is ignored.
  const draggedRef = useRef(false)

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    disableScroll()

    startRef.current = { x: event.clientX, y: event.clientY }
    maxTravelRef.current = 0
    draggedRef.current = false
    pointerTypeRef.current = event.pointerType

    setGhostTheme({
      vars: resolveApollonThemeVars(event.currentTarget),
      dataTheme:
        event.currentTarget
          .closest("[data-theme]")
          ?.getAttribute("data-theme") ?? undefined,
    })

    const previewElement = event.currentTarget.querySelector<HTMLElement>(
      "[data-draggable-preview]"
    )
    const previewRect = (
      previewElement ?? event.currentTarget
    ).getBoundingClientRect()
    // Where the cursor sits inside the preview, as a fraction of it. The ghost and
    // the dropped node are both drawn at sizes the palette preview does not share,
    // so a pixel offset taken here would not line up with either; a fraction does,
    // at any zoom. The drop reads this same fraction, so the ghost cannot end up
    // anchored to a different point than the node it turns into.
    const grabX = previewRect.width
      ? (event.clientX - previewRect.left) / previewRect.width
      : 0
    const grabY = previewRect.height
      ? (event.clientY - previewRect.top) / previewRect.height
      : 0
    grabFractionRef.current = { x: grabX, y: grabY }

    // Draw the ghost at the on-screen size the node will have at this zoom. The
    // drop size is used rather than the palette size so an element that drops
    // larger than it previews (a swimlane: 160×100 → 400×240) is shown at its
    // true dropped size, and the SVG lays its content out for that size instead
    // of having a smaller rendering stretched over it.
    const zoom = getViewport().zoom
    setGhostRender({ scale: zoom })

    const ghostWidth = ghostDropWidth * zoom
    const ghostHeight = ghostDropHeight * zoom
    setGhostOffset({ x: grabX * ghostWidth, y: grabY * ghostHeight })
    setGhostPosition({
      x: event.clientX - grabX * ghostWidth,
      y: event.clientY - grabY * ghostHeight,
    })

    setIsDragging(true)
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (!isDragging) return
    if (startRef.current) {
      const travelled = Math.hypot(
        event.clientX - startRef.current.x,
        event.clientY - startRef.current.y
      )
      if (travelled > maxTravelRef.current) maxTravelRef.current = travelled
    }
    setGhostPosition({
      x: event.clientX - ghostOffset.x,
      y: event.clientY - ghostOffset.y,
    })
  }

  // Shared teardown for a completed gesture or an interrupted one
  // (pointercancel: gesture taken over by the OS, multi-touch, etc.).
  const resetDrag = () => {
    enableScroll()
    setIsDragging(false)
    setGhostPosition({ x: 0, y: 0 })
  }

  // `dropAtPointer` changes whenever `nodes` changes (constant on a busy
  // canvas). Reading it through a ref lets the document listeners bind once per
  // drag, not once per render.
  const dropRef = useRef(dropAtPointer)
  useEffect(() => {
    dropRef.current = dropAtPointer
  }, [dropAtPointer])

  // A drag that actually placed a node emits no click on this cell, so also
  // clear the guard on the next task — otherwise a later AT/synthetic click
  // (which arrives with no preceding pointerdown to reset it) would be swallowed.
  const suppressTrailingClick = () => {
    draggedRef.current = true
    window.setTimeout(() => {
      draggedRef.current = false
    }, 0)
  }

  // End the gesture. Classified over the WHOLE press, not just its endpoints, so
  // an out-and-back drag can't read as a tap; the touch threshold is looser
  // because finger-roll on an intended tap exceeds a mouse-tight one. The guard
  // keys on the OUTCOME: only a drag that actually dropped suppresses the
  // trailing click. A drag released off-canvas placed nothing, so its click
  // still falls through to place at the centre (the tap the user meant).
  const handlePointerUp = (event: PointerEvent) => {
    resetDrag()
    const slop =
      pointerTypeRef.current === "touch"
        ? DROPS.TAP_SLOP_TOUCH_PX
        : DROPS.TAP_SLOP_MOUSE_PX
    const placed =
      maxTravelRef.current >= slop &&
      dropRef.current(event, grabFractionRef.current)
    if (placed) suppressTrailingClick()
    else draggedRef.current = false
  }

  const handlePointerCancel = () => {
    suppressTrailingClick() // ignore any stray click; nothing was placed
    resetDrag()
  }

  useEffect(() => {
    if (!isDragging) return
    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)
    document.addEventListener("pointercancel", handlePointerCancel)
    return () => {
      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)
      document.removeEventListener("pointercancel", handlePointerCancel)
    }
  }, [isDragging, ghostOffset])

  // A press that became a drag also fires a click on release — ignore it, the
  // drop already happened. A real tap (and keyboard / AT activation of the
  // button role) places the element at the viewport centre.
  const handleClick = () => {
    if (draggedRef.current) {
      draggedRef.current = false
      return
    }
    placeAtViewportCenter()
  }

  // `fixed`, not `absolute`: the ghost portals into document.body and is
  // positioned with viewport coordinates (clientX/clientY). `absolute` resolves
  // against the document, so any page scroll would shift the ghost off the
  // cursor when the editor is embedded below the fold; `fixed` matches clientX/Y.
  const ghostElement = (
    <div
      data-draggable-preview
      data-theme={ghostTheme.dataTheme}
      style={{
        ...ghostTheme.vars,
        position: "fixed",
        left: `${ghostPosition.x}px`,
        top: `${ghostPosition.y}px`,
        pointerEvents: "none",
        zIndex: ZINDEX.DRAGGABLE_ELEMENT,
        opacity: 0.8,
      }}
    >
      {/* Rendered at the drop size so the SVG lays out for it, instead of reusing
          the palette's preview element. */}
      {React.createElement(dropElementConfig.svg, {
        width: ghostDropWidth,
        height: ghostDropHeight,
        ...dropElementConfig.defaultData,
        data: dropElementConfig.defaultData,
        SIDEBAR_PREVIEW_SCALE: ghostRender.scale,
      })}
    </div>
  )

  const elementName =
    typeof dropElementConfig.defaultData?.name === "string" &&
    dropElementConfig.defaultData.name
      ? (dropElementConfig.defaultData.name as string)
      : nodeTypeLabel(dropElementConfig.type)

  return (
    <>
      <button
        type="button"
        className="apollon-palette__cell"
        aria-label={`${addElementLabel}: ${elementName}`}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        style={{ touchAction: "none" }}
      >
        {children}
      </button>
      {isDragging && createPortal(ghostElement, portalContainer)}
    </>
  )
}
