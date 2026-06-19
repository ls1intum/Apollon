import { DEFAULT_FONT_SIZE, FONT_FAMILY } from "@/fontStack"

export const measureTextWidth = (() => {
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  const defaultFont = `400 ${DEFAULT_FONT_SIZE}px ${FONT_FAMILY}`

  return (text: string, font: string = defaultFont): number => {
    if (!context) return text.length * 8
    context.font = font
    return context.measureText(text).width
  }
})()
