import React, { useState } from "react"
import { PaintRoller } from "lucide-react"
import { Popover } from "@base-ui/react/popover"
import { DividerLine, Typography } from "@/components/ui"
import { EditorColorPicker } from "./ColorButtons"
import { usePortalThemeVars } from "@/components/ui/portalTheme"
import { useLabels } from "@/i18n/useLabels"

/**
 * One color row inside the popover: a label and the swatch picker for that field.
 * The Node and Edge editors are otherwise ~80% identical, so the whole panel —
 * the header row (lead content + paint toggle + trailing side content) and the
 * color rows behind the paint toggle — lives here once. Both editors describe
 * their fields as `ColorField`s and hand over `getColor`/`onColorChange`;
 * everything visual is styled in app.css keyed on the data-slots below.
 */
export interface ColorField<K extends string = string> {
  key: K
  label: string
}

interface StyleEditorPanelProps<K extends string> {
  /** Color fields rendered as rows inside the popover. */
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
  colorEditorActionLabel,
  children,
  sideElements = [],
  headerVariant = "node",
}: StyleEditorPanelProps<K>) {
  const t = useLabels()
  // The popup portals to <body>, escaping the `.apollon-editor` subtree that
  // scopes `--apollon-*`; carry the resolved theme onto it (same as the swatch
  // picker) so a dark/custom embed theme paints the panel.
  const [trigger, setTrigger] = useState<HTMLElement | null>(null)
  const portalThemeVars = usePortalThemeVars(trigger)
  const paintToggleLabel = colorEditorActionLabel ?? t.editColors

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
          <Popover.Root>
            <Popover.Trigger
              ref={setTrigger}
              data-slot="icon-button"
              aria-label={paintToggleLabel}
            >
              <PaintRoller width={16} height={16} aria-hidden="true" />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner sideOffset={6} align="end">
                <Popover.Popup
                  data-slot="style-editor-content"
                  className="apollon-style-editor__popup"
                  aria-label={paintToggleLabel}
                  style={portalThemeVars}
                >
                  {fields.map(({ key, label }, index) => (
                    <React.Fragment key={key}>
                      <div
                        data-slot="style-editor-row"
                        className="apollon-style-editor__row"
                      >
                        <Typography>{label}</Typography>
                        <EditorColorPicker
                          label={t.colorPicker(label)}
                          selectedColor={getColor(key) ?? ""}
                          onSelect={(color) => onColorChange(key, color)}
                          onReset={() => onColorChange(key, "")}
                        />
                      </div>
                      {index !== fields.length - 1 && (
                        <DividerLine
                          color="var(--popover-divider)"
                          margin={0}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
          {sideElements.map((element, index) => (
            <React.Fragment key={`side-element-${index}`}>
              {element}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
