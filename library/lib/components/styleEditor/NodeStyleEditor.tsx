import React from "react"
import { TextField, Typography } from "@/components/ui"
import { ColorField, StyleEditorPanel } from "./StyleEditorPanel"
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
  inputPlaceholder = "Name",
  noStrokeUpdate = false,
  showNameInputChange = true,
  isMultilineName = false,
  preElements = [],
}) => {
  // Three small literals; re-computed on every render is cheaper than memoizing.
  const colorFields: ColorField<keyof DefaultNodeProps>[] = noStrokeUpdate
    ? [
        { key: "fillColor", label: "Fill Color" },
        { key: "textColor", label: "Text Color" },
      ]
    : [
        { key: "fillColor", label: "Fill Color" },
        { key: "strokeColor", label: "Line Color" },
        { key: "textColor", label: "Text Color" },
      ]

  const colorEditorActionLabel = colorEditorLabel
    ? `Edit ${colorEditorLabel} colors`
    : "Edit colors"

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
          placeholder={inputPlaceholder}
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
          Style
        </Typography>
      )}
    </StyleEditorPanel>
  )
}
