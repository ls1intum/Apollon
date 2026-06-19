import React, { useMemo, useSyncExternalStore } from "react"
import {
  ColorDescriptionConfig,
  DROPS,
  dropElementConfigs,
  LAYOUT,
  MOBILE_VIEW_QUERY,
} from "@/constants"
import { DividerLine } from "./ui/DividerLine"
import { useMetadataStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { DraggableGhost } from "./DraggableGhost"
import { ApollonView } from "@/typings"

/* ========================================================================
   Sidebar Component
   Renders the draggable elements based on the selected diagram type.
   ======================================================================== */

// Types whose preview reserves an extra attribute row of height.
const labelPreviewTypes = new Set([
  "sfcTransitionBranch",
  "petriNetPlace",
  "petriNetTransition",
])

// `matchMedia` as an external store: synchronous first-paint value (no
// desktop→mobile flash) and concurrency-safe under React 18+/19.
const subscribeToMobile = (onChange: () => void) => {
  if (typeof window === "undefined" || !window.matchMedia) return () => {}
  const mql = window.matchMedia(MOBILE_VIEW_QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}
const getMobileSnapshot = () =>
  typeof window !== "undefined" && !!window.matchMedia
    ? window.matchMedia(MOBILE_VIEW_QUERY).matches
    : false

export const Sidebar = () => {
  const isMobile = useSyncExternalStore(
    subscribeToMobile,
    getMobileSnapshot,
    () => false
  )

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

  if (paletteItems.length === 0) {
    return null
  }

  const getPreviewScale = (width: number, height: number, extraHeight = 0) => {
    if (!isMobile) return DROPS.SIDEBAR_PREVIEW_SCALE

    return Math.min(0.55, 32 / width, 32 / (height + extraHeight))
  }

  return (
    <aside
      className={`apollon-palette ${
        isMobile ? "apollon-palette--mobile" : "apollon-palette--desktop"
      }`}
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
        <div className="apollon-palette__entries">
          {paletteItems.map((config, index) => {
            const extraPreviewHeight = labelPreviewTypes.has(config.type)
              ? LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT
              : 0
            const previewScale = getPreviewScale(
              config.width,
              config.height,
              extraPreviewHeight
            )
            const previewWidth = config.width * previewScale
            const previewHeight =
              (config.height + extraPreviewHeight) * previewScale

            return (
              <DraggableGhost
                key={`${config.type}_${config.defaultData?.name}`}
                dropElementConfig={config}
                previewScale={previewScale}
              >
                <div className="apollon-palette__entry prevent-select">
                  <div
                    data-draggable-preview
                    style={{
                      width: previewWidth,
                      height: previewHeight,
                      marginTop: isMobile ? 0 : config.marginTop,
                    }}
                  >
                    {React.createElement(config.svg, {
                      width: config.width,
                      height: config.height,
                      ...config.defaultData,
                      data: config.defaultData,
                      SIDEBAR_PREVIEW_SCALE: previewScale,
                      id: `sidebarElement_${index}`,
                    })}
                  </div>
                </div>
              </DraggableGhost>
            )
          })}
          <div className="apollon-palette__separator">
            <DividerLine style={{ margin: 0 }} />
          </div>
          {(() => {
            const colorPreviewScale = getPreviewScale(
              ColorDescriptionConfig.width,
              ColorDescriptionConfig.height
            )
            return (
              <DraggableGhost
                dropElementConfig={ColorDescriptionConfig}
                previewScale={colorPreviewScale}
              >
                <div className="apollon-palette__entry prevent-select">
                  <div
                    data-draggable-preview
                    style={{
                      width: ColorDescriptionConfig.width * colorPreviewScale,
                      height: ColorDescriptionConfig.height * colorPreviewScale,
                    }}
                  >
                    {React.createElement(ColorDescriptionConfig.svg, {
                      width: ColorDescriptionConfig.width,
                      height: ColorDescriptionConfig.height,
                      ...ColorDescriptionConfig.defaultData,
                      data: ColorDescriptionConfig.defaultData,
                      SIDEBAR_PREVIEW_SCALE: colorPreviewScale,
                      id: "sidebarElement_ColorDescription",
                    })}
                  </div>
                </div>
              </DraggableGhost>
            )
          })()}
        </div>
      )}
    </aside>
  )
}
