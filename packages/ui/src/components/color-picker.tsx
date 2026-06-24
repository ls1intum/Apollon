import { CheckIcon } from "lucide-react"
import * as React from "react"

import { cn } from "../lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { ToggleGroup, ToggleGroupItem } from "./toggle-group"

// The swatch palette is sourced from design tokens, NOT an inline hex array:
// each entry names a `--color-swatch-*` token (defined in styles/theme.css and
// driven by the primitives in tokens.css), and the value handed back to the
// consumer is the CSS `var(...)` reference, so a chosen swatch re-resolves per
// theme. A custom color picked through the native `input[type=color]` is a real
// hex string. `cn()` is used for the few presentational utilities so a theming
// embedder still recolors everything through the tokens.
const SWATCH_TOKENS = [
  { name: "Slate", token: "--color-swatch-slate" },
  { name: "Red", token: "--color-swatch-red" },
  { name: "Orange", token: "--color-swatch-orange" },
  { name: "Amber", token: "--color-swatch-amber" },
  { name: "Green", token: "--color-swatch-green" },
  { name: "Teal", token: "--color-swatch-teal" },
  { name: "Blue", token: "--color-swatch-blue" },
  { name: "Violet", token: "--color-swatch-violet" },
  { name: "Pink", token: "--color-swatch-pink" },
] as const

const swatchValue = (token: string) => `var(${token})`

type ColorPickerProps = Omit<
  React.ComponentProps<"div">,
  "onChange" | "defaultValue"
> & {
  /** Controlled selected color (a swatch's `var(--color-swatch-*)` or a hex). */
  value?: string
  /** Selected color on mount (uncontrolled). */
  defaultValue?: string
  /** Called with the newly selected color. */
  onValueChange?: (value: string) => void
  /** Accessible label for the trigger and swatch group. */
  "aria-label"?: string
}

function ColorPicker({
  className,
  value,
  defaultValue,
  onValueChange,
  "aria-label": ariaLabel = "Pick a color",
  ...props
}: ColorPickerProps) {
  const isControlled = value !== undefined
  const [internal, setInternal] = React.useState(defaultValue ?? "")
  const selected = isControlled ? value : internal

  const setSelected = React.useCallback(
    (next: string) => {
      if (!isControlled) {
        setInternal(next)
      }
      onValueChange?.(next)
    },
    [isControlled, onValueChange]
  )

  // ToggleGroup is single-select: it reports an array, we read the last entry.
  const handleGroupChange = React.useCallback(
    (groupValue: string[]) => {
      const next = groupValue.at(-1)
      if (next) {
        setSelected(next)
      }
    },
    [setSelected]
  )

  const isCustom =
    selected !== "" &&
    !SWATCH_TOKENS.some((s) => swatchValue(s.token) === selected)

  return (
    <div
      data-slot="color-picker"
      className={cn("inline-flex", className)}
      {...props}
    >
      <Popover>
        <PopoverTrigger
          aria-label={ariaLabel}
          className={cn(
            "border-input focus-visible:border-ring focus-visible:ring-ring/50 size-8 shrink-0 rounded-md border outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
          )}
          style={{ backgroundColor: selected || "transparent" }}
        />
        <PopoverContent className="w-auto" align="start">
          <ToggleGroup
            aria-label={ariaLabel}
            spacing={4}
            value={selected ? [selected] : []}
            onValueChange={handleGroupChange}
            className="grid grid-cols-5"
          >
            {SWATCH_TOKENS.map(({ name, token }) => {
              const itemValue = swatchValue(token)
              return (
                <ToggleGroupItem
                  key={token}
                  value={itemValue}
                  aria-label={name}
                  className="size-7 rounded-md border border-border-subtle p-0"
                  style={{ backgroundColor: itemValue }}
                >
                  {selected === itemValue ? (
                    <CheckIcon className="size-4 text-white drop-shadow-[0_0_1px_rgba(0,0,0,0.6)]" />
                  ) : null}
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>
          <label className="text-muted-foreground mt-2.5 flex items-center justify-between gap-2 text-sm">
            Custom
            <input
              type="color"
              aria-label="Custom color"
              data-custom-active={isCustom || undefined}
              value={isCustom ? selected : "#000000"}
              onChange={(event) => setSelected(event.target.value)}
              className="border-input size-7 cursor-pointer rounded-md border bg-transparent p-0.5 outline-none data-[custom-active]:ring-2 data-[custom-active]:ring-ring"
            />
          </label>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { ColorPicker, SWATCH_TOKENS }
