import React from "react"
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
  const { diagramType, view, setView, enableQuizMode } = useMetadataStore(
    useShallow((state) => ({
      diagramType: state.diagramType,
      view: state.view,
      setView: state.setView,
      enableQuizMode: state.enableQuizMode,
    }))
  )
  const labelPreviewTypes = new Set([
    "sfcTransitionBranch",
    "petriNetPlace",
    "petriNetTransition",
  ])

  if (dropElementConfigs[diagramType].length === 0) {
    return null
  }

  return (
    <aside
      style={{
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
      }}
    >
      {enableQuizMode && (
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
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
            }}
          >
            Quiz Elements
          </button>
        </div>
      )}

      {enableQuizMode && view === ApollonView.Highlight && (
        <div
          style={{
            width: "100%",
            fontSize: "12px",
            lineHeight: 1.4,
            color: "var(--apollon-primary-contrast, #000000)",
          }}
        >
          Click nodes or relationships to mark the quiz-relevant elements.
        </div>
      )}

      {(!enableQuizMode || view === ApollonView.Modelling) &&
        dropElementConfigs[diagramType].map((config, index) => {
          const extraPreviewHeight = labelPreviewTypes.has(config.type)
            ? LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT
            : 0
          const previewScale = DROPS.SIDEBAR_PREVIEW_SCALE
          const previewWidth = config.width * previewScale
          const previewHeight =
            (config.height + extraPreviewHeight) * previewScale

          return (
            <React.Fragment key={`${config.type}_${config.defaultData?.name}`}>
              <DraggableGhost dropElementConfig={config}>
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

      {(!enableQuizMode || view === ApollonView.Modelling) && (
        <>
          <DividerLine style={{ margin: "3px 0" }} />
          <DraggableGhost dropElementConfig={ColorDescriptionConfig}>
            <div
              className="prevent-select"
              style={{
                width:
                  ColorDescriptionConfig.width * DROPS.SIDEBAR_PREVIEW_SCALE,
                height:
                  ColorDescriptionConfig.height * DROPS.SIDEBAR_PREVIEW_SCALE,
                zIndex: ZINDEX.DRAGGABLE_GHOST,
                marginTop: ColorDescriptionConfig.marginTop,
              }}
            >
              {React.createElement(ColorDescriptionConfig.svg, {
                width: ColorDescriptionConfig.width,
                height: ColorDescriptionConfig.height,
                ...ColorDescriptionConfig.defaultData,
                data: ColorDescriptionConfig.defaultData,
                SIDEBAR_PREVIEW_SCALE: DROPS.SIDEBAR_PREVIEW_SCALE,
                id: "sidebarElement_ColorDescription",
              })}
            </div>
          </DraggableGhost>
        </>
      )}
    </aside>
  )
}
