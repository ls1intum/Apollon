import React, { useEffect, useMemo, useState } from "react"
import {
  ColorDescriptionConfig,
  DROPS,
  dropElementConfigs,
  LAYOUT,
  ZINDEX,
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

    const mql = window.matchMedia("(max-width: 768px)")
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)

    setIsMobile(mql.matches)
    // Safari < 14 — use any to satisfy older APIs where TS defs differ
    if ("addEventListener" in mql) mql.addEventListener("change", onChange)
    else (mql as any).addListener(onChange)

    return () => {
      if ("removeEventListener" in mql)
        mql.removeEventListener("change", onChange)
      else (mql as any).removeListener(onChange)
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

  const previewScale = useMemo(
    () => (isMobile ? 0.225 : DROPS.SIDEBAR_PREVIEW_SCALE),
    [isMobile]
  )

  if (dropElementConfigs[diagramType].length === 0) {
    return null
  }

  return (
    <aside
      style={{
        ...(isMobile
          ? {
              position: "absolute",
              left: 0,
              right: 0,
              top: 40,
              width: "100%",
              height: "auto",
              backgroundColor: "var(--apollon-background, white)",
              display: "flex",
              flexDirection: "row",
              padding: `10px calc(10px + var(--safe-area-inset-right, 0px)) 10px calc(10px + var(--safe-area-inset-left, 0px))`,
              gap: "12px",
              alignItems: "center",
              overflowX: "auto",
              overflowY: "hidden",
              flexShrink: 0,
              zIndex: ZINDEX.DRAGGABLE_GHOST,
              borderBottom:
                "1px solid var(--apollon-background-variant, #e5e7eb)",
            }
          : {
              width: "180px",
              minWidth: "180px",
              height: "100%",
              backgroundColor: "var(--apollon-background, white)",
              display: "flex",
              flexDirection: "column",
              padding: "10px",
              gap: "15px",
              alignItems: "center",
              overflowY: "auto",
              flexShrink: 0,
            }),
      }}
    >
      {showInteractiveSelectionView && (
        <div
          style={{
            width: isMobile ? "auto" : "100%",
            display: "flex",
            flexDirection: isMobile ? "row" : "column",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={() => setView(ApollonView.Modelling)}
            style={{
              borderRadius: "8px",
              border: "1px solid var(--apollon-primary-contrast, #000000)",
              background:
                view === ApollonView.Modelling
                  ? "var(--apollon-primary, #3e8acc)"
                  : "transparent",
              color:
                view === ApollonView.Modelling
                  ? "var(--apollon-background, #ffffff)"
                  : "var(--apollon-primary-contrast, #000000)",
              padding: "8px 10px",
              cursor: "pointer",
              fontWeight: 600,
              whiteSpace: "nowrap",
              fontSize: "inherit",
            }}
          >
            Model
          </button>
          <button
            type="button"
            onClick={() => setView(ApollonView.Highlight)}
            style={{
              borderRadius: "8px",
              border: "1px solid var(--apollon-primary-contrast, #000000)",
              background:
                view === ApollonView.Highlight
                  ? "var(--apollon-primary, #3e8acc)"
                  : "transparent",
              color:
                view === ApollonView.Highlight
                  ? "var(--apollon-background, #ffffff)"
                  : "var(--apollon-primary-contrast, #000000)",
              padding: "8px 10px",
              cursor: "pointer",
              fontWeight: 600,
              whiteSpace: "nowrap",
              fontSize: "inherit",
            }}
          >
            Select Elements
          </button>
        </div>
      )}

      {view === ApollonView.Highlight && !isMobile && (
        <div
          style={{
            width: "100%",
            fontSize: "12px",
            lineHeight: 1.4,
            color: "var(--apollon-primary-contrast, #000000)",
          }}
        >
          Click nodes or relationships to toggle whether they are interactive.
        </div>
      )}

      {view === ApollonView.Modelling &&
        dropElementConfigs[diagramType].map((config, index) => {
          const extraPreviewHeight = labelPreviewTypes.has(config.type)
            ? LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT
            : 0
          const previewWidth = config.width * previewScale
          const previewHeight =
            (config.height + extraPreviewHeight) * previewScale

          return (
            <React.Fragment key={`${config.type}_${config.defaultData?.name}`}>
              <DraggableGhost
                dropElementConfig={config}
                previewScale={previewScale}
              >
                <div
                  className="prevent-select"
                  style={{
                    width: previewWidth,
                    height: previewHeight,
                    zIndex: ZINDEX.DRAGGABLE_GHOST,
                    marginTop: config.marginTop,
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
              </DraggableGhost>
            </React.Fragment>
          )
        })}

      {view === ApollonView.Modelling && (
        <>
          {!isMobile && <DividerLine style={{ margin: "3px 0" }} />}
          <DraggableGhost
            dropElementConfig={ColorDescriptionConfig}
            previewScale={previewScale}
          >
            <div
              className="prevent-select"
              style={{
                width: ColorDescriptionConfig.width * previewScale,
                height: ColorDescriptionConfig.height * previewScale,
                zIndex: ZINDEX.DRAGGABLE_GHOST,
                marginTop: ColorDescriptionConfig.marginTop,
              }}
            >
              {React.createElement(ColorDescriptionConfig.svg, {
                width: ColorDescriptionConfig.width,
                height: ColorDescriptionConfig.height,
                ...ColorDescriptionConfig.defaultData,
                data: ColorDescriptionConfig.defaultData,
                SIDEBAR_PREVIEW_SCALE: previewScale,
                id: "sidebarElement_ColorDescription",
              })}
            </div>
          </DraggableGhost>
        </>
      )}
    </aside>
  )
}
