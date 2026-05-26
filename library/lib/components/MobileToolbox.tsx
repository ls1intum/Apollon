import React from "react"
import { dropElementConfigs, ZINDEX } from "@/constants"
import { useMetadataStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { DraggableGhost } from "./DraggableGhost"

export const MobileToolbox: React.FC = () => {
  const { diagramType } = useMetadataStore(
    useShallow((state) => ({ diagramType: state.diagramType }))
  )

  const previewScale = 0.225

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        display: "flex",
        gap: 12,
        padding: `8px 10px 8px calc(10px + var(--safe-area-inset-left, 0px))`,
        alignItems: "center",
        overflowX: "auto",
        overflowY: "hidden",
        zIndex: ZINDEX.DRAGGABLE_GHOST,
        background: "var(--apollon-background, white)",
        borderBottom: "1px solid var(--apollon-background-variant, #e5e7eb)",
      }}
    >
      {dropElementConfigs[diagramType].map((cfg, i) => (
        <DraggableGhost
          key={cfg.type + i}
          dropElementConfig={cfg}
          previewScale={previewScale}
        >
          <div
            style={{
              width: cfg.width * previewScale,
              height: cfg.height * previewScale,
            }}
          >
            {React.createElement(cfg.svg, {
              width: cfg.width,
              height: cfg.height,
              SIDEBAR_PREVIEW_SCALE: previewScale,
              data: cfg.defaultData,
            })}
          </div>
        </DraggableGhost>
      ))}
    </div>
  )
}

export default MobileToolbox
