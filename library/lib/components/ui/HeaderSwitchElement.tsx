import { ZINDEX } from "@/constants"
import React from "react"

interface Props {
  onClick: () => void
  isComponentHeaderShown: boolean
}
export const HeaderSwitchElement: React.FC<Props> = ({
  onClick,
  isComponentHeaderShown,
}) => {
  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: ZINDEX.HEADER_SWITCH,
        color: "var(--apollon-primary-contrast)",
        ...(isComponentHeaderShown && {
          background:
            "linear-gradient(to top right, transparent calc(50% - 1px), var(--apollon-primary-contrast) 50%, transparent calc(50% + 1px))",
        }),
      }}
    >
      {"«»"}
    </div>
  )
}
