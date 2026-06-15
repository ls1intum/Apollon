import React, { useEffect, useMemo, useState } from "react"
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

export const Sidebar = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return

    const mql = window.matchMedia(MOBILE_VIEW_QUERY)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)

    setIsMobile(mql.matches)
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange)
    } else {
      mql.addListener(onChange)
    }

    return () => {
      if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", onChange)
      } else {
        mql.removeListener(onChange)
      }
    }
  }, [])

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
  const labelPreviewTypes = new Set([
    "sfcTransitionBranch",
    "petriNetPlace",
    "petriNetTransition",
  ])

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

  const getPaletteLabel = (type: string) =>
    type
      .replace(/^bpmn/, "BPMN")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/^./, (character) => character.toUpperCase())

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
            const label = getPaletteLabel(config.type)

            return (
              <DraggableGhost
                key={`${config.type}_${config.defaultData?.name}`}
                dropElementConfig={config}
                previewScale={previewScale}
              >
                <div
                  className="apollon-palette__entry prevent-select"
                  title={`Drag ${label}`}
                >
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
          <DraggableGhost
            dropElementConfig={ColorDescriptionConfig}
            previewScale={getPreviewScale(
              ColorDescriptionConfig.width,
              ColorDescriptionConfig.height
            )}
          >
            <div
              className="apollon-palette__entry prevent-select"
              title="Drag Color Description"
            >
              <div
                data-draggable-preview
                style={{
                  width:
                    ColorDescriptionConfig.width *
                    getPreviewScale(
                      ColorDescriptionConfig.width,
                      ColorDescriptionConfig.height
                    ),
                  height:
                    ColorDescriptionConfig.height *
                    getPreviewScale(
                      ColorDescriptionConfig.width,
                      ColorDescriptionConfig.height
                    ),
                }}
              >
                {React.createElement(ColorDescriptionConfig.svg, {
                  width: ColorDescriptionConfig.width,
                  height: ColorDescriptionConfig.height,
                  ...ColorDescriptionConfig.defaultData,
                  data: ColorDescriptionConfig.defaultData,
                  SIDEBAR_PREVIEW_SCALE: getPreviewScale(
                    ColorDescriptionConfig.width,
                    ColorDescriptionConfig.height
                  ),
                  id: "sidebarElement_ColorDescription",
                })}
              </div>
            </div>
          </DraggableGhost>
        </div>
      )}
    </aside>
  )
}
