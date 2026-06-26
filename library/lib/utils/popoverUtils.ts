import { Quadrant } from "@/enums"
import { LocationPopover } from "@/types"

const originMap: Record<Quadrant, LocationPopover> = {
  [Quadrant.TopRight]: {
    transformOrigin: { vertical: "top", horizontal: "right" },
  },
  [Quadrant.TopLeft]: {
    transformOrigin: { vertical: "top", horizontal: "left" },
  },
  [Quadrant.BottomLeft]: {
    transformOrigin: { vertical: "bottom", horizontal: "left" },
  },
  [Quadrant.BottomRight]: {
    transformOrigin: { vertical: "bottom", horizontal: "right" },
  },
}

export const getPopoverOrigin = (quadrant: Quadrant): LocationPopover => {
  return originMap[quadrant]
}
