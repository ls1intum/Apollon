import React, { useState } from "react"
import { PaintRoller, X } from "lucide-react"
import { DividerLine, IconButton, TextField, Typography } from "@/components/ui"
import { ColorButton, ColorButtons } from "./ColorButtons"
import { useColorEditorDisclosure } from "./ColorEditorGroup"
import { DefaultNodeProps } from "@/types"

interface NodeStyleEditorProps {
  nodeData: DefaultNodeProps
  handleDataFieldUpdate: (key: keyof DefaultNodeProps, value: string) => void
  preElements?: React.ReactNode[]
  sideElements?: React.ReactNode[]
  colorEditorLabel?: string
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
    flexWrap: "wrap" as const,
    gap: "8px",
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

export const NodeStyleEditor: React.FC<NodeStyleEditorProps> = ({
  nodeData,
  handleDataFieldUpdate,
  sideElements = [],
  colorEditorLabel,
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

  const { open: paintOpen, setOpen: setPaintOpen } = useColorEditorDisclosure()
  const [activeColorField, setActiveColorField] = useState<
    keyof DefaultNodeProps | null
  >(null)
  const colorEditorActionLabel = colorEditorLabel
    ? `Edit ${colorEditorLabel} colors`
    : "Edit colors"

  const toggleColorField = (key: keyof DefaultNodeProps) => {
    setActiveColorField((prev) => (prev === key ? null : key))
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {/* One wrapping row for every caller: the name input flexes to fill the
          width, and the buttons stay grouped on the right. When the side
          content is too wide to share the line (e.g. the «stereotype» toggle),
          the whole button group wraps below instead of crushing the input —
          so no per-node-type branching is needed. */}
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
            sx={{ flex: 1, minWidth: 90 }}
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
            marginLeft: "auto",
          }}
        >
          <IconButton
            ariaLabel={colorEditorActionLabel}
            tooltip={colorEditorActionLabel}
            aria-expanded={paintOpen}
            onClick={() => {
              setPaintOpen(!paintOpen)
              setActiveColorField(null)
            }}
          >
            <PaintRoller width={16} height={16} aria-hidden="true" />
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
            colorFields.map(({ key, label }, index) => (
              <React.Fragment key={`${nodeData.name}-${key}-option`}>
                <ColorOption
                  key={`${nodeData.name}-${key}-option`}
                  label={label}
                  color={nodeData[key]}
                  selected={Boolean(nodeData[key])}
                  onSelect={() => toggleColorField(key)}
                />
                {key !== colorFields[colorFields.length - 1].key && (
                  <DividerLine
                    backgroundColor="var(--apollon-gray, #e9ecef)"
                    style={
                      key === "fillColor" &&
                      colorFields[index + 1]?.key === "textColor"
                        ? { margin: 0 }
                        : undefined
                    }
                  />
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
                  <X width={16} height={16} aria-hidden="true" />
                </IconButton>
              </div>
              <ColorButtons
                selectedColor={nodeData[activeColorField] ?? ""}
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
