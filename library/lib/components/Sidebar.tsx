import React, { useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  ColorDescriptionConfig,
  dropElementConfigs,
  LAYOUT,
  MOBILE_VIEW_QUERY,
} from "@/constants"
import { useMetadataStore, useOverlayStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { DraggableGhost } from "./DraggableGhost"
import { ApollonMode, ApollonView } from "@/typings"
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
const PALETTE_LAYOUT_SLACK = 4

export const Sidebar = () => {
  const { diagramType, view, setView, availableViews, mode, readonly, labels } =
    useMetadataStore(
      useShallow((state) => ({
        diagramType: state.diagramType,
        view: state.view,
        setView: state.setView,
        availableViews: state.availableViews,
        mode: state.mode,
        readonly: state.readonly,
        labels: state.labels,
      }))
    )
  // The palette only makes sense while modelling an editable diagram. Gating here
  // (not in the caller) keeps every registration path identical — the default
  // chrome, `<Apollon.Palette/>`, and the vanilla `paletteControl()` all hide it
  // outside modelling, and the empty left-rail band then reserves no room.
  const showPalette = mode === ApollonMode.Modelling && !readonly
  const showInteractiveSelectionView =
    availableViews.includes(ApollonView.Highlight) ||
    view === ApollonView.Highlight

  const paletteItems = useMemo(
    () => dropElementConfigs[diagramType],
    [diagramType]
  )

  // The palette is a rail overlay control. Generic rail/corner clearance lives in
  // OverlayLayer; the palette only reads the rail's current content box to size
  // its internal grid.
  const isRightRail = useOverlayStore(
    (state) => state.controls["apollon:palette"]?.region === "right-rail"
  )
  const asideRef = useRef<HTMLElement>(null)
  const [canvas, setCanvas] = useState({ w: 0, h: 0, compact: false })

  useLayoutEffect(() => {
    const aside = asideRef.current
    const band = aside?.closest(".apollon-overlay-band") as HTMLElement | null
    const canvasEl = aside?.closest(".apollon-canvas") as HTMLElement | null
    if (!aside || !band || !canvasEl) return
    const mobileQuery = window.matchMedia(MOBILE_VIEW_QUERY)
    const measure = () => {
      const gap =
        parseFloat(
          getComputedStyle(aside).getPropertyValue("--apollon-chrome-gap")
        ) || 8
      const bandStyle = getComputedStyle(band)
      const verticalPadding =
        (parseFloat(bandStyle.paddingTop) || 0) +
        (parseFloat(bandStyle.paddingBottom) || 0)
      const h = Math.max(0, band.clientHeight - verticalPadding - 2 * gap)
      const w = canvasEl.getBoundingClientRect().width
      const compact = mobileQuery.matches
      setCanvas((prev) =>
        prev.w === w && prev.h === h && prev.compact === compact
          ? prev
          : { w, h, compact }
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(band)
    observer.observe(canvasEl)
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
        Math.max(0, canvas.h - PALETTE_LAYOUT_SLACK),
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

  if (!showPalette || paletteItems.length === 0) {
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

  const paletteStyle: React.CSSProperties = {
    ...(canvas.h ? { maxHeight: canvas.h } : null),
    ...(isRightRail
      ? { marginLeft: 0, marginRight: "var(--apollon-chrome-edge)" }
      : null),
  }

  return (
    <aside
      ref={asideRef}
      className="apollon-palette"
      data-testid="apollon-palette"
      aria-label={labels.elementPalette}
      // Bounded to the rail band the engine reserved (grid math already fits
      // within it; this caps the rare overflow case to a scroll, not spill).
      style={paletteStyle}
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
            {labels.paletteModelView}
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
            {labels.paletteSelectElementsView}
          </button>
        </div>
      )}

      {view === ApollonView.Highlight && (
        <div className="apollon-palette__hint">
          {labels.paletteHighlightHint}
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
