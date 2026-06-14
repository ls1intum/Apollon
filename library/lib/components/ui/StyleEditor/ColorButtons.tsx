import React from "react"
import { CheckIcon } from "@/components/Icon"

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
    style={{ "--swatch-color": color } as React.CSSProperties}
    aria-pressed={selected}
    aria-label={color}
  >
    {selected && (
      <CheckIcon
        className="apollon-color-swatch__icon"
        width={16}
        height={16}
        fill="var(--apollon-background, #ffffff)"
        aria-hidden="true"
      />
    )}
  </button>
)
