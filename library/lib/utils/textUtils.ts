export const measureTextWidth = (() => {
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  const defaultFont =
    "400 16px Inter, system-ui, Avenir, Helvetica, Arial, sans-serif"

  return (text: string, font: string = defaultFont): number => {
    if (!context) return text.length * 8
    context.font = font
    return context.measureText(text).width
  }
})()
