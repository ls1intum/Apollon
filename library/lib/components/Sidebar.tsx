import React, { useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  ColorDescriptionConfig,
  dropElementConfigs,
  LAYOUT,
  MOBILE_VIEW_QUERY,
} from "@/constants"
import { useMetadataStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { DraggableGhost } from "./DraggableGhost"
import { ApollonView } from "@/typings"
import {
  COMPACT_PALETTE,
  PALETTE,
  computePaletteLayout,
  previewScaleForCell,
} from "@/utils/paletteLayout"

/* ========================================================================
   Sidebar (element palette)
   A floating overlay on the canvas (all viewports). It lays every draggable
   element out in a grid sized — via `computePaletteLayout` — so they all stay
   in view without scrolling, as large as the canvas reasonably allows.
   ======================================================================== */

// Types whose preview reserves an extra attribute row of height.
const labelPreviewTypes = new Set([
  "sfcTransitionBranch",
  "petriNetPlace",
  "petriNetTransition",
])

// Extra height an element's preview reserves below its body for a label band.
const previewExtraHeight = (type: string) =>
  labelPreviewTypes.has(type) ? LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT : 0

// Rough height of the Model/Select view switch when shown — used as the
// non-grid budget so the grid still fits under it without scrolling.
const VIEW_SWITCH_HEIGHT = 64

export const Sidebar = () => {
  const { diagramType, view, setView, availableViews } = useMetadataStore(
    useShallow((state) => ({
      diagramType: state.diagramType,
      view: state.view,
      setView: state.setView,
      availableViews: state.availableViews,
    }))
  )
  const showInteractiveSelectionView =
    availableViews.includes(ApollonView.Highlight) ||
    view === ApollonView.Highlight

  const paletteItems = useMemo(
    () => dropElementConfigs[diagramType],
    [diagramType]
  )

  // Measure the canvas the palette floats over (its positioned ancestor) so the
  // grid can size itself to the available room.
  const asideRef = useRef<HTMLElement>(null)
  const [canvas, setCanvas] = useState({ w: 0, h: 0, compact: false })

  useLayoutEffect(() => {
    const aside = asideRef.current
    const parent = aside?.offsetParent as HTMLElement | null
    if (!aside || !parent) return
    const mobileQuery = window.matchMedia(MOBILE_VIEW_QUERY)
    const measure = () => {
      const rect = parent.getBoundingClientRect()
      // Size the grid to the palette's ACTUAL available height — the gap between
      // its own top and the bottom controls — not the full canvas height. The
      // palette is CSS-capped to that band (max-height), so using the canvas
      // height over-counts by the top/bottom chrome and overflows on short
      // viewports. Measuring real elements keeps this in sync with the CSS
      // without duplicating the max-height formula in JS.
      const asideTop = aside.getBoundingClientRect().top
      const controls = parent.querySelector(".react-flow__controls")
      const GAP = 8 // --apollon-chrome-gap: palette clears the controls by one
      const bottomLimit = controls
        ? controls.getBoundingClientRect().top - GAP
        : rect.bottom - (asideTop - rect.top) // symmetric fallback
      const h = Math.max(0, bottomLimit - asideTop)
      setCanvas({ w: rect.width, h, compact: mobileQuery.matches })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(parent)
    mobileQuery.addEventListener("change", measure)
    return () => {
      observer.disconnect()
      mobileQuery.removeEventListener("change", measure)
    }
  }, [])

  // The color-description element is the last grid cell.
  const cellCount = paletteItems.length + 1
  const chromeHeight = showInteractiveSelectionView ? VIEW_SWITCH_HEIGHT : 0
  const layout = useMemo(
    () =>
      computePaletteLayout(
        cellCount,
        canvas.w,
        canvas.h,
        chromeHeight,
        canvas.compact
      ),
    [cellCount, canvas.w, canvas.h, canvas.compact, chromeHeight]
  )
  const paletteMetrics = canvas.compact ? COMPACT_PALETTE : PALETTE

  // One uniform scale for the whole palette: pick the largest scale at which
  // EVERY element still fits its cell, then render them all at it. This keeps
  // the elements' true relative sizes (a small interface stays small next to a
  // big component) instead of each element being stretched to fill its own
  // cell, which would invert proportions and clip small elements' labels.
  const previewScale = useMemo(() => {
    if (layout.cellW <= 0 || layout.cellH <= 0) return 0
    return Math.min(
      ...[...paletteItems, ColorDescriptionConfig].map((config) =>
        previewScaleForCell(
          config.width,
          config.height + previewExtraHeight(config.type),
          layout.cellW,
          layout.cellH,
          canvas.compact
        )
      )
    )
  }, [paletteItems, layout.cellW, layout.cellH, canvas.compact])

  if (paletteItems.length === 0) {
    return null
  }

  const cellStyle = { width: layout.cellW, height: layout.cellH }

  const renderCell = (
    config: (typeof paletteItems)[number],
    id: string,
    keyValue: string
  ) => {
    const extraPreviewHeight = previewExtraHeight(config.type)
    return (
      <DraggableGhost
        key={keyValue}
        dropElementConfig={config}
        previewScale={previewScale}
      >
        <div
          className="apollon-palette__entry prevent-select"
          style={cellStyle}
        >
          <div
            data-draggable-preview
            style={{
              width: config.width * previewScale,
              height: (config.height + extraPreviewHeight) * previewScale,
            }}
          >
            {React.createElement(config.svg, {
              width: config.width,
              height: config.height,
              ...config.defaultData,
              data: config.defaultData,
              SIDEBAR_PREVIEW_SCALE: previewScale,
              id,
            })}
          </div>
        </div>
      </DraggableGhost>
    )
  }

  return (
    <aside
      ref={asideRef}
      className="apollon-palette"
      data-testid="apollon-palette"
    >
      {showInteractiveSelectionView && (
        <div className="apollon-palette__view-switch">
          <button
            type="button"
            onClick={() => setView(ApollonView.Modelling)}
            className={
              view === ApollonView.Modelling
                ? "apollon-palette__view-button apollon-palette__view-button--active"
                : "apollon-palette__view-button"
            }
          >
            Model
          </button>
          <button
            type="button"
            onClick={() => setView(ApollonView.Highlight)}
            className={
              view === ApollonView.Highlight
                ? "apollon-palette__view-button apollon-palette__view-button--active"
                : "apollon-palette__view-button"
            }
          >
            Select Elements
          </button>
        </div>
      )}

      {view === ApollonView.Highlight && (
        <div className="apollon-palette__hint">
          Click nodes or relationships to toggle whether they are interactive.
        </div>
      )}

      {view === ApollonView.Modelling && (
        <div
          className="apollon-palette__entries"
          style={{
            gridTemplateColumns: `repeat(${layout.cols}, ${layout.cellW}px)`,
            gap: paletteMetrics.GAP,
          }}
        >
          {paletteItems.map((config, index) =>
            renderCell(
              config,
              `sidebarElement_${index}`,
              `${config.type}_${config.defaultData?.name}`
            )
          )}
          {renderCell(
            ColorDescriptionConfig,
            "sidebarElement_ColorDescription",
            "colorDescription"
          )}
        </div>
      )}
    </aside>
  )
}
