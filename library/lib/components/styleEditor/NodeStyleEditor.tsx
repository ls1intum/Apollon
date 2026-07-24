import React from "react"
import { TextField, Typography } from "@/components/ui"
import { ColorField, StyleEditorPanel } from "./StyleEditorPanel"
import { DefaultNodeProps } from "@/types"
import { useLabels } from "@/i18n/useLabels"

// The string-valued DefaultNodeProps fields this editor writes. Excludes
// `tags` (a string[]), so neither a swatch value nor the name input can be
// typed into it.
type ColorKey = "fillColor" | "strokeColor" | "textColor"
type EditableKey = ColorKey | "name"

interface NodeStyleEditorProps {
  nodeData: DefaultNodeProps
  handleDataFieldUpdate: (key: EditableKey, value: string) => void
  preElements?: React.ReactNode[]
  sideElements?: React.ReactNode[]
  colorEditorLabel?: string
  inputPlaceholder?: string
  noStrokeUpdate?: boolean
  showNameInputChange?: boolean
  /**
   * Whether the name input accepts newlines (Enter inserts a hard break).
   * Default `false`. Set to `true` ONLY for node types whose SVG actually
   * renders wrapped labels — otherwise typing a newline would save a
   * character that never repaints. See `supportsMultilineName()` in
   * `utils/nodeUtils.ts` for the canonical per-type list.
   */
  isMultilineName?: boolean
}

export const NodeStyleEditor: React.FC<NodeStyleEditorProps> = ({
  nodeData,
  handleDataFieldUpdate,
  sideElements = [],
  colorEditorLabel,
  inputPlaceholder,
  noStrokeUpdate = false,
  showNameInputChange = true,
  isMultilineName = false,
  preElements = [],
}) => {
  const t = useLabels()
  // Three small literals; re-computed on every render is cheaper than memoizing.
  const colorFields: ColorField<ColorKey>[] = noStrokeUpdate
    ? [
        { key: "fillColor", label: t.fillColor },
        { key: "textColor", label: t.textColor },
      ]
    : [
        { key: "fillColor", label: t.fillColor },
        { key: "strokeColor", label: t.lineColor },
        { key: "textColor", label: t.textColor },
      ]

  const colorEditorActionLabel = colorEditorLabel
    ? t.editColorsFor(colorEditorLabel)
    : t.editColors

  return (
    <StyleEditorPanel
      fields={colorFields}
      getColor={(key) => nodeData[key]}
      onColorChange={handleDataFieldUpdate}
      colorEditorActionLabel={colorEditorActionLabel}
      sideElements={sideElements}
      headerVariant="node"
    >
      {/* One wrapping row for every caller: the name input flexes to fill the
          width, and the buttons stay grouped on the right. When the side
          content is too wide to share the line (e.g. the «stereotype» toggle),
          the whole button group wraps below instead of crushing the input —
          so no per-node-type branching is needed. */}
      {preElements}
      {showNameInputChange ? (
        <TextField
          onChange={(event) =>
            handleDataFieldUpdate("name", event.target.value)
          }
          style={{ flex: 1, minWidth: 90 }}
          value={nodeData.name ?? ""}
          placeholder={inputPlaceholder ?? t.namePlaceholder}
          // Only enable multiline — which lets Enter insert a hard line
          // break — for node types whose SVG actually wraps the label.
          // Single-line nodes keep their classic single-line <input>.
          multiline={isMultilineName}
          minRows={isMultilineName ? 1 : undefined}
        />
      ) : (
        // Name-less nodes (swimlane, SFC action table, activity initial/final/
        // fork) match the edge popovers' "Style" heading instead of a blank
        // header row.
        <Typography variant="subtitle2" style={{ fontWeight: 600 }}>
          {t.style}
        </Typography>
      )}
    </StyleEditorPanel>
  )
}
