import React from "react"
import { Check } from "lucide-react"
import { Popover } from "@base-ui/react/popover"
import { ToggleGroup } from "@base-ui/react/toggle-group"
import { Toggle } from "@base-ui/react/toggle"
import { Button } from "@/components/ui"
import {
  NATIVE_COLOR_INPUT_FALLBACK,
  SWATCH_NAMES,
} from "@tumaet/ui/lib/color-swatch-tokens"

// Embed-safe editor color-picker. Mirrors the @tumaet/ui color-picker
// (color-picker.tsx) STRUCTURE — a swatch trigger that opens a Popover holding
// a swatch grid plus a native custom-color input — but ships NO Tailwind
// utilities: every part carries a data-slot and is styled by semantic CSS in
// app.css keyed on those attributes and driven by --apollon-* tokens + the
// radius scale. That parallel impl is intentional: the webapp twin can't be
// reused in the Tailwind-free embed bundle.
//
// The swatch palette + native-input fallback are shared DATA, imported from
// @tumaet/ui/lib/color-swatch-tokens (plain TS, embed-safe — no CSS) so they
// can't drift from the webapp twin. Here each base name maps to its
// --apollon-swatch-* token (defined in packages/ui tokens.css), and the value
// handed back to the consumer is the CSS `var(...)` reference, so a chosen
// swatch re-resolves per theme. A custom color picked through the native input
// is a real hex string. There is no luminance/contrast math: the selected check
// mark contrasts via mix-blend in CSS, not a JS helper.
const SWATCH_TOKENS = SWATCH_NAMES.map(
  (name) => `--apollon-swatch-${name}`
) as readonly string[]

const swatchValue = (token: string) => `var(${token})`

interface EditorColorPickerProps {
  /** Currently selected color (a swatch `var(--apollon-swatch-*)` or a hex). */
  selectedColor?: string
  /** Called with the newly selected color. */
  onSelect: (color: string) => void
  /** Called to clear the color back to its inherited default. */
  onReset?: () => void
  /** Accessible label for the trigger and swatch group. */
  label?: string
}

export const EditorColorPicker: React.FC<EditorColorPickerProps> = ({
  selectedColor = "",
  onSelect,
  onReset,
  label = "Pick a color",
}) => {
  const isCustom =
    selectedColor !== "" &&
    !SWATCH_TOKENS.some((token) => swatchValue(token) === selectedColor)

  // ToggleGroup is single-select: it reports an array, we read the last entry.
  const handleGroupChange = (groupValue: string[]) => {
    const next = groupValue.at(-1)
    if (next) {
      onSelect(next)
    }
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        data-slot="color-picker-trigger"
        className="apollon-color-swatch"
        aria-label={label}
        style={
          {
            "--swatch-color": selectedColor || "transparent",
          } as React.CSSProperties
        }
      />
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start">
          <Popover.Popup
            data-slot="color-picker-content"
            className="apollon-color-picker__popup"
          >
            <ToggleGroup
              data-slot="color-picker-grid"
              className="apollon-color-picker__grid"
              aria-label={label}
              value={selectedColor ? [selectedColor] : []}
              onValueChange={handleGroupChange}
            >
              {SWATCH_TOKENS.map((token) => {
                const itemValue = swatchValue(token)
                const selected = selectedColor === itemValue
                return (
                  <Toggle
                    key={token}
                    value={itemValue}
                    data-slot="color-picker-swatch"
                    className="apollon-color-swatch"
                    data-state={selected ? "on" : "off"}
                    aria-label={token.replace("--apollon-swatch-", "")}
                    style={
                      { "--swatch-color": itemValue } as React.CSSProperties
                    }
                  >
                    {selected && (
                      <Check
                        className="apollon-color-swatch__icon"
                        width={16}
                        height={16}
                        aria-hidden="true"
                      />
                    )}
                  </Toggle>
                )
              })}
            </ToggleGroup>

            <label
              data-slot="color-picker-custom"
              className="apollon-color-picker__custom"
            >
              Custom
              <input
                type="color"
                aria-label="Custom color"
                data-custom-active={isCustom || undefined}
                value={isCustom ? selectedColor : NATIVE_COLOR_INPUT_FALLBACK}
                onChange={(event) => onSelect(event.target.value)}
              />
            </label>

            {onReset && (
              <Button
                variant="outlined"
                data-slot="color-picker-reset"
                className="apollon-color-picker__reset"
                onClick={onReset}
              >
                Reset
              </Button>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
