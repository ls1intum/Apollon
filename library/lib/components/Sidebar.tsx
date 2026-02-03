import React from "react"
import {
  ColorDescriptionConfig,
  DROPS,
  dropElementConfigs,
  ZINDEX,
} from "@/constants"
import { DividerLine } from "./ui/DividerLine"
import { useMetadataStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { DraggableGhost } from "./DraggableGhost"

/* ========================================================================
   Sidebar Component
   Renders the draggable elements based on the selected diagram type.
   ======================================================================== */

export const Sidebar = () => {
  const diagramType = useMetadataStore(useShallow((state) => state.diagramType))

  if (dropElementConfigs[diagramType].length === 0) {
    return null
  }

  return (
    <aside
      style={{
        width: "180px",
        minWidth: "180px",
        height: "100%",
        backgroundColor: "var(--apollon2-background)",
        display: "flex",
        flexDirection: "column",
        padding: "10px",
        gap: "15px",
        alignItems: "center",
        overflowY: "auto",
        flexShrink: 0,
      }}
    >
      {dropElementConfigs[diagramType].map((config, index) => (
        <React.Fragment key={`${config.type}_${config.defaultData?.name}`}>
          <DraggableGhost dropElementConfig={config}>
            <div
              className="prevent-select"
              style={{
                width: config.width * DROPS.SIDEBAR_PREVIEW_SCALE,
                height: config.height * DROPS.SIDEBAR_PREVIEW_SCALE,
                zIndex: ZINDEX.DRAGGABLE_GHOST,
                marginTop: config.marginTop,
              }}
            >
              {React.createElement(config.svg, {
                width: config.width,
                height: config.height,
                ...config.defaultData,
                data: config.defaultData,
                SIDEBAR_PREVIEW_SCALE: DROPS.SIDEBAR_PREVIEW_SCALE,
                id: `sidebarElement_${index}`,
              })}
            </div>
          </DraggableGhost>
        </React.Fragment>
      ))}

      <DividerLine style={{ margin: "3px 0" }} />
      <DraggableGhost dropElementConfig={ColorDescriptionConfig}>
        <div
          className="prevent-select"
          style={{
            width: ColorDescriptionConfig.width * DROPS.SIDEBAR_PREVIEW_SCALE,
            height: ColorDescriptionConfig.height * DROPS.SIDEBAR_PREVIEW_SCALE,
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
    </aside>
  )
}
