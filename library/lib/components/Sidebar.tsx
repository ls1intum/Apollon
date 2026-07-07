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

  // The palette is a rail overlay control. The rail itself stays height-stable
  // when unrelated corner chrome moves; the palette only caps its own grid when
  // same-side bottom chrome would otherwise overlap it in a short viewport.
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
      // Start with the rail band's stable height, then cap it at the same-side
      // bottom corner only when that corner is occupied. That preserves palette
      // size-invariance for unrelated chrome (e.g. bottom-right controls do not
      // resize a left palette) while still preventing a real same-side collision
      // with the zoom/minimap cluster on short mobile viewports.
      const gap =
        parseFloat(
          getComputedStyle(aside).getPropertyValue("--apollon-chrome-gap")
        ) || 8
      const bandRect = band.getBoundingClientRect()
      const bottomRegion = isRightRail ? "bottom-right" : "bottom-left"
      const bottomControl = canvasEl.querySelector<HTMLElement>(
        `[data-apollon-region="${bottomRegion}"] [data-apollon-control]`
      )
      const bottomLimit = bottomControl
        ? bottomControl.getBoundingClientRect().top - gap
        : bandRect.bottom - gap
      const h = Math.max(0, bottomLimit - bandRect.top - gap)
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
    for (const region of ["bottom-left", "bottom-right"]) {
      const corner = canvasEl.querySelector(`[data-apollon-region="${region}"]`)
      if (corner) observer.observe(corner)
    }
    mobileQuery.addEventListener("change", measure)
    return () => {
      observer.disconnect()
      mobileQuery.removeEventListener("change", measure)
    }
  }, [isRightRail])

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
