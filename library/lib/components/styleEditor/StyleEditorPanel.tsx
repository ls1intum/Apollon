import React from "react"
import { PaintRoller } from "lucide-react"
import { DividerLine, IconButton, Typography } from "@/components/ui"
import { EditorColorPicker } from "./ColorButtons"
import { useColorEditorDisclosure } from "./ColorEditorGroup"

/**
 * One color row inside the panel: a label and the swatch picker for that field.
 * The Node and Edge editors are otherwise ~80% identical, so the whole panel —
 * the header row (lead content + paint toggle + trailing side content) and the
 * list of color rows — lives here once. Both editors describe their fields as
 * `ColorField`s and hand over `getColor`/`onColorChange`; everything visual is
 * styled in app.css keyed on the data-slots below, not inline.
 */
export interface ColorField<K extends string = string> {
  key: K
  label: string
}

interface StyleEditorPanelProps<K extends string> {
  /** Color fields rendered as rows when the panel is open. */
  fields: ColorField<K>[]
  /** Current value of a field (a swatch `var(...)` or hex), or undefined. */
  getColor: (key: K) => string | undefined
  /** Set or clear (empty string) a field's color. */
  onColorChange: (key: K, value: string) => void
  /** Accessible label for the paint toggle. */
  colorEditorActionLabel?: string
  /** Lead content of the header row (e.g. a title or the name input). */
  children?: React.ReactNode
  /** Trailing controls of the header row (e.g. the stereotype toggle). */
  sideElements?: React.ReactNode[]
  /** Layout flavour for the header row (Node wraps; Edge spaces-between). */
  headerVariant?: "node" | "edge"
}

export function StyleEditorPanel<K extends string>({
  fields,
  getColor,
  onColorChange,
  colorEditorActionLabel = "Edit colors",
  children,
  sideElements = [],
  headerVariant = "node",
}: StyleEditorPanelProps<K>) {
  const { open: paintOpen, setOpen: setPaintOpen } = useColorEditorDisclosure()

  return (
    <div data-slot="style-editor" className="apollon-style-editor">
      <div
        data-slot="style-editor-header"
        data-variant={headerVariant}
        className="apollon-style-editor__header"
      >
        {children}
        <div
          data-slot="style-editor-header-actions"
          className="apollon-style-editor__header-actions"
        >
          <IconButton
            ariaLabel={colorEditorActionLabel}
            tooltip={colorEditorActionLabel}
            aria-expanded={paintOpen}
            onClick={() => setPaintOpen(!paintOpen)}
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
        <div
          data-slot="style-editor-panel"
          className="apollon-style-editor__panel"
        >
          {fields.map(({ key, label }, index) => (
            <React.Fragment key={key}>
              <div
                data-slot="style-editor-row"
                className="apollon-style-editor__row"
              >
                <Typography>{label}</Typography>
                <EditorColorPicker
                  label={`${label} picker`}
                  selectedColor={getColor(key) ?? ""}
                  onSelect={(color) => onColorChange(key, color)}
                  onReset={() => onColorChange(key, "")}
                />
              </div>
              {index !== fields.length - 1 && (
                <DividerLine color="var(--apollon-border-subtle)" margin={0} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}
