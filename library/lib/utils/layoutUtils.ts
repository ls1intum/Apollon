import { CANVAS } from "@/constants"
import { DefaultNodeProps } from "@/types"

/**
 * Calculates the minimum width required to fit the text with specified padding and margin.
 * @param maxTextWidth - The maximum width of the text.
 * @param padding - The inner padding for text.
 * @returns The calculated minimum width.
 */
export const calculateMinWidth = (
  maxTextWidth: number,
  padding: number
): number => {
  const minWidth = maxTextWidth + 2 * padding
  const minWidthWithSnapToGrid =
    Math.ceil(minWidth / CANVAS.EXTRA_SPACE_FOR_EXTENSION) *
    CANVAS.EXTRA_SPACE_FOR_EXTENSION
  return minWidthWithSnapToGrid
}

/**
 * Calculates the minimum height based on header, attributes, methods, and margins.
 * @param headerHeight - The height of the header section.
 * @param attributesCount - Number of attributes.
 * @param methodsCount - Number of methods.
 * @param attributeHeight - Height per attribute.
 * @param methodHeight - Height per method.
 * @returns The calculated minimum height.
 */
export const calculateMinHeight = (
  headerHeight: number,
  attributesCount: number,
  methodsCount: number,
  attributeHeight: number,
  methodHeight: number
): number => {
  const minHeight =
    headerHeight +
    attributesCount * attributeHeight +
    methodsCount * methodHeight
  const minHeightWithSnapToGrid =
    Math.ceil(minHeight / CANVAS.EXTRA_SPACE_FOR_EXTENSION) *
    CANVAS.EXTRA_SPACE_FOR_EXTENSION
  return minHeightWithSnapToGrid
}

// Every CSS-variable reference carries a literal fallback so the editor
// renders correctly even when the host page never defines the theme
// variables (e.g. embedded on a plain site). Without the fallback an
// undefined variable makes the SVG `fill`/`stroke` default to black.
const STROKE_VAR = "var(--apollon-foreground, #000000)"
const FILL_VAR = "var(--apollon-background, #ffffff)"

export const getCustomColorsFromData = (data: DefaultNodeProps) => {
  const strokeColor = data.strokeColor || STROKE_VAR
  const fillColor = data.fillColor || FILL_VAR
  const textColor = data.textColor || STROKE_VAR
  return { strokeColor, fillColor, textColor }
}

export const getCustomColorsFromDataForEdge = (data?: {
  strokeColor?: string
  textColor?: string
}) => {
  const strokeColor = data?.strokeColor || STROKE_VAR
  const textColor = data?.textColor || STROKE_VAR
  return { strokeColor, textColor }
}
