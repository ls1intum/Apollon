import React, { useState } from "react"
import { DividerLine, TextField, Typography } from "@/components/ui"
import { PaintRollerIcon } from "@/components/Icon/PaintRollerIcon"
import { CrossIcon } from "@/components/Icon"
import { ColorButton, ColorButtons } from "./ColorButtons"
import { DefaultNodeProps } from "@/types"

interface NodeStyleEditorProps {
  nodeData: DefaultNodeProps
  handleDataFieldUpdate: (key: keyof DefaultNodeProps, value: string) => void
  preElements?: React.ReactNode[]
  sideElements?: React.ReactNode[]
  inputPlaceholder?: string
  noStrokeUpdate?: boolean
  showNameInputChange?: boolean
  title?: string
  /**
   * Whether the name input accepts newlines (Enter inserts a hard break).
   * Default `false`. Set to `true` ONLY for node types whose SVG actually
   * renders wrapped labels — otherwise typing a newline would save a
   * character that never repaints. See `supportsMultilineName()` in
   * `utils/nodeUtils.ts` for the canonical per-type list.
   */
  isMultilineName?: boolean
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
  onSelect: () => void
}> = ({ label, color, onSelect }) => (
  <div style={styles.colorOption}>
    <Typography>{label}</Typography>
    <ColorButton onSelect={onSelect} color={color || "#000000"} />
  </div>
)

export const NodeStyleEditor: React.FC<NodeStyleEditorProps> = ({
  nodeData,
  handleDataFieldUpdate,
  sideElements = [],
  inputPlaceholder = "Enter node name",
  noStrokeUpdate = false,
  showNameInputChange = true,
  isMultilineName = false,
  title,
  preElements = [],
}) => {
  // Three small literals; re-computed on every render is cheaper than memoizing.
  const colorFields: { key: keyof DefaultNodeProps; label: string }[] =
    noStrokeUpdate
      ? [
          { key: "fillColor", label: "Fill Color" },
          { key: "textColor", label: "Text Color" },
        ]
      : [
          { key: "fillColor", label: "Fill Color" },
          { key: "strokeColor", label: "Line Color" },
          { key: "textColor", label: "Text Color" },
        ]

  const [paintOpen, setPaintOpen] = useState(false)
  const [activeColorField, setActiveColorField] = useState<
    keyof DefaultNodeProps | null
  >(null)

  const toggleColorField = (key: keyof DefaultNodeProps) => {
    setActiveColorField((prev) => (prev === key ? null : key))
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <div style={styles.container}>
        {preElements}
        {title && (
          <Typography style={{ fontWeight: "bold", marginRight: 8 }}>
            {title}
          </Typography>
        )}
        {showNameInputChange && (
          <TextField
            variant="outlined"
            onChange={(event) =>
              handleDataFieldUpdate("name", event.target.value)
            }
            sx={{ flex: 1 }}
            size="small"
            value={nodeData.name ?? ""}
            placeholder={inputPlaceholder}
            // Only enable multiline — which lets Enter insert a hard line
            // break — for node types whose SVG actually wraps the label.
            // Single-line nodes keep their classic single-line <input>.
            multiline={isMultilineName}
            minRows={isMultilineName ? 1 : undefined}
            maxRows={isMultilineName ? 6 : undefined}
          />
        )}
        <PaintRollerIcon
          onClick={() => setPaintOpen(!paintOpen)}
          aria-label="Toggle color settings"
        />

        {sideElements.map((element, index) => (
          <React.Fragment key={`side-element-${index}`}>
            {element}
          </React.Fragment>
        ))}
      </div>

      {paintOpen && (
        <div style={styles.colorPanel}>
          {!activeColorField ? (
            colorFields.map(({ key, label }) => (
              <React.Fragment key={`${nodeData.name}-${key}-option`}>
                <ColorOption
                  key={`${nodeData.name}-${key}-option`}
                  label={label}
                  color={nodeData[key]}
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
                <CrossIcon
                  fill="var(--apollon-primary-contrast, #000000)"
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
