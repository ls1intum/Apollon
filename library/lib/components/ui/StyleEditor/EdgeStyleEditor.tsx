import React, { useState } from "react"
import { DividerLine, Typography } from "@/components/ui"
import { PaintRollerIcon } from "@/components/Icon/PaintRollerIcon"
import { CrossIcon } from "@/components/Icon"
import { ColorButton, ColorButtons } from "./ColorButtons"
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
    backgroundColor: "var(--apollon-background)",
    border: "1px solid var(--apollon-gray)",
    paddingBottom: 10,
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
    backgroundColor: "var(--apollon-background)",
    color: "var(--apollon-primary-contrast)",
    border: "1px solid var(--apollon-gray)",
    cursor: "pointer",
    borderRadius: 4,
    width: "fit-content",
  },
}

// Subcomponent for rendering a single color option
const ColorOption: React.FC<{
  label: string
  color: string | undefined
  onSelect: () => void
}> = ({ label, color, onSelect }) => (
  <div style={styles.colorOption}>
    <Typography>{label}</Typography>
    <ColorButton onSelect={onSelect} color={color || "#000000"} />
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
  const [paintOpen, setPaintOpen] = useState(false)
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
        marginTop: 10,
        marginBottom: 10,
      }}
    >
      <div style={styles.container}>
        <Typography variant="subtitle1" fontWeight="bold">
          {label}
        </Typography>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PaintRollerIcon
            onClick={() => setPaintOpen(!paintOpen)}
            aria-label="Toggle color settings"
          />
          {sideElements}
        </div>
      </div>

      {paintOpen && (
        <div style={styles.colorPanel}>
          {!activeColorField ? (
            colorFields.map(({ key, label }) => (
              <>
                <ColorOption
                  key={`${edgeData?.label}-${key}-option`}
                  label={label}
                  color={edgeData ? edgeData[key] : undefined}
                  onSelect={() => toggleColorField(key)}
                />
                {key !== colorFields[colorFields.length - 1].key && (
                  <DividerLine backgroundColor="var(--apollon-gray)" />
                )}
              </>
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
                <CrossIcon
                  fill="var(--apollon-primary-contrast)"
                  onClick={() => setActiveColorField(null)}
                />
              </div>
              <ColorButtons
                onSelect={(color) =>
                  handleDataFieldUpdate(activeColorField, color)
                }
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
