import React, { useState } from "react"
import { DividerLine, IconButton, Typography } from "@/components/ui"
import { PaintRollerIcon } from "@/components/Icon/PaintRollerIcon"
import { CrossIcon } from "@/components/Icon"
import { ColorButton, ColorButtons } from "./ColorButtons"
import { useColorEditorDisclosure } from "./ColorEditorGroup"
import { CustomEdgeProps } from "@/edges"

type updateEdgeDataColorsKeys = "strokeColor" | "textColor"

interface EdgeStyleEditorProps {
  edgeData?: CustomEdgeProps
  handleDataFieldUpdate: (key: updateEdgeDataColorsKeys, value: string) => void
  sideElements?: React.ReactNode[]
  label: string
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "row" as const,
    alignItems: "center",
    justifyContent: "space-between",
    gap: "5px",
    flex: 1,
  },
  colorPanel: {
    display: "flex",
    flexDirection: "column" as const,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: "var(--apollon-background, white)",
    border: "1px solid var(--apollon-gray, #e9ecef)",
  },
  colorOption: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  colorPickerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    padding: 16,
  },
  resetButton: {
    marginTop: 12,
    padding: "6px 12px",
    backgroundColor: "var(--apollon-background, white)",
    color: "var(--apollon-primary-contrast, #000000)",
    border: "1px solid var(--apollon-gray, #e9ecef)",
    cursor: "pointer",
    borderRadius: 4,
    width: "fit-content",
  },
}

// Subcomponent for rendering a single color option
const ColorOption: React.FC<{
  label: string
  color: string | undefined
  selected?: boolean
  onSelect: () => void
}> = ({ label, color, selected = false, onSelect }) => (
  <div style={styles.colorOption}>
    <Typography>{label}</Typography>
    <ColorButton
      onSelect={onSelect}
      color={color || "#000000"}
      selected={selected}
    />
  </div>
)

const colorFields: { key: updateEdgeDataColorsKeys; label: string }[] = [
  { key: "strokeColor", label: "Line Color" },
  { key: "textColor", label: "Text Color" },
]

export const EdgeStyleEditor: React.FC<EdgeStyleEditorProps> = ({
  edgeData,
  handleDataFieldUpdate,
  sideElements = [],
  label,
}) => {
  const { open: paintOpen, setOpen: setPaintOpen } = useColorEditorDisclosure()
  const [activeColorField, setActiveColorField] =
    useState<updateEdgeDataColorsKeys | null>(null)

  const toggleColorField = (key: updateEdgeDataColorsKeys) => {
    setActiveColorField((prev) => (prev === key ? null : key))
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      <div style={styles.container}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconButton
            ariaLabel="Edit colors"
            tooltip="Edit colors"
            aria-expanded={paintOpen}
            onClick={() => {
              setPaintOpen(!paintOpen)
              setActiveColorField(null)
            }}
          >
            <PaintRollerIcon />
          </IconButton>
          {sideElements.map((element, index) => (
            <React.Fragment key={`side-element-${index}`}>
              {element}
            </React.Fragment>
          ))}
        </div>
      </div>

      {paintOpen && (
        <div style={styles.colorPanel}>
          {!activeColorField ? (
            colorFields.map(({ key, label }) => (
              <React.Fragment key={key}>
                <ColorOption
                  label={label}
                  color={edgeData ? edgeData[key] : undefined}
                  selected={Boolean(edgeData?.[key])}
                  onSelect={() => toggleColorField(key)}
                />
                {key !== colorFields[colorFields.length - 1].key && (
                  <DividerLine backgroundColor="var(--apollon-gray, #e9ecef)" />
                )}
              </React.Fragment>
            ))
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={styles.colorPickerHeader}>
                <Typography>
                  {colorFields.find((f) => f.key === activeColorField)?.label}
                </Typography>
                <IconButton
                  ariaLabel="Close color picker"
                  tooltip="Close color picker"
                  onClick={() => setActiveColorField(null)}
                >
                  <CrossIcon fill="var(--apollon-primary-contrast, #000000)" />
                </IconButton>
              </div>
              <ColorButtons
                selectedColor={edgeData?.[activeColorField] ?? ""}
                onSelect={(color) => {
                  handleDataFieldUpdate(activeColorField, color)
                  setActiveColorField(null)
                }}
              />
              <button
                style={styles.resetButton}
                onClick={() => handleDataFieldUpdate(activeColorField, "")}
              >
                Reset
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
