import React from "react"
import { Check } from "lucide-react"

interface ColorButtonsProps {
  onSelect: (color: string) => void
  selectedColor?: string
}

const COLOR_PALETTE = [
  "#fc5c65",
  "#fd9644",
  "#fed330",
  "#26de81",
  "#2bcbba",
  "#45aaf2",
  "#4b7bec",
  "#6a89cc",
  "#a55eea",
  "#d1d8e0",
  "#778ca3",
  "#000000",
]

const getContrastColor = (color: string) => {
  const normalized = color.trim().toLowerCase()
  const hex = normalized.startsWith("#") ? normalized.slice(1) : normalized
  const expandedHex =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : hex

  if (!/^[\da-f]{6}$/i.test(expandedHex)) {
    return "var(--apollon-primary-contrast, #000000)"
  }

  const red = parseInt(expandedHex.slice(0, 2), 16)
  const green = parseInt(expandedHex.slice(2, 4), 16)
  const blue = parseInt(expandedHex.slice(4, 6), 16)
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000

  return luminance >= 160 ? "#000000" : "#ffffff"
}

export const ColorButtons: React.FC<ColorButtonsProps> = ({
  onSelect,
  selectedColor,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        flexWrap: "wrap",
        gap: 20,
        justifyContent: "center",
        padding: 16,
      }}
    >
      {COLOR_PALETTE.map((color) => (
        <ColorButton
          key={color}
          color={color}
          onSelect={onSelect}
          selected={color === selectedColor}
        />
      ))}
    </div>
  )
}

interface ColorButtonProps {
  color: string
  onSelect: (color: string) => void
  selected?: boolean
}

export const ColorButton = ({
  color,
  onSelect,
  selected = false,
}: ColorButtonProps) => (
  <button
    type="button"
    className="apollon-color-swatch"
    onClick={() => onSelect(color)}
    style={
      {
        "--swatch-color": color,
        color: getContrastColor(color),
      } as React.CSSProperties
    }
    aria-pressed={selected}
    aria-label={color}
  >
    {selected && (
      <Check
        className="apollon-color-swatch__icon"
        width={16}
        height={16}
        aria-hidden="true"
      />
    )}
  </button>
)
