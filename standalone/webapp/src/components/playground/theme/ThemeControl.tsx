import { RotateCcw } from "lucide-react"
import { Input } from "@tumaet/ui/components/input"
import { Label } from "@tumaet/ui/components/label"
import { Slider } from "@tumaet/ui/components/slider"
import type { ThemeToken } from "./themeTokens"

const HEX6 = /^#[0-9a-f]{6}$/i

// A native <input type=color> only accepts a 6-digit hex. For rgba()/var()/
// color-mix() defaults it can't render the true value, so we fall back to a
// neutral swatch and let the adjacent text field carry the real CSS string.
const toColorInputValue = (value: string): string =>
  HEX6.test(value.trim()) ? value.trim() : "#ffffff"

const pxToNumber = (value: string): number => {
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

export interface ThemeControlProps {
  token: ThemeToken
  /** The active override, or undefined when the token is at its default. */
  override: string | undefined
  onChange: (value: string) => void
  onReset: () => void
}

/**
 * One themable variable, rendered as the control its type implies: a color
 * swatch + free-text field, a px slider, or a shadow text field. Shows the
 * default the editor currently resolves (light or dark) until overridden, and a
 * reset affordance once it isn't.
 */
export const ThemeControl = ({
  token,
  override,
  onChange,
  onReset,
}: ThemeControlProps) => {
  // `token.default` is the LIGHT default; read what the editor actually paints in
  // the current theme off the live container so an un-overridden control shows the
  // right value in dark mode. Re-reads each render — the document-theme toggle
  // already re-renders this control.
  const editor = document.querySelector(".apollon-editor")
  const liveDefault =
    (editor &&
      getComputedStyle(editor).getPropertyValue(token.cssVar).trim()) ||
    token.default

  const value = override ?? liveDefault
  const isOverridden = override !== undefined
  const controlId = `theme-${token.cssVar}`

  return (
    <div
      className="flex flex-col gap-1.5 py-2"
      data-testid={`theme-control-${token.cssVar}`}
      data-overridden={isOverridden}
    >
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={controlId} className="text-xs font-medium">
          {token.label}
        </Label>
        <div className="flex items-center gap-1">
          <code className="text-muted-foreground text-[10px]">
            {token.cssVar}
          </code>
          <button
            type="button"
            aria-label={`Reset ${token.label} to default`}
            title="Reset to default"
            onClick={onReset}
            disabled={!isOverridden}
            data-testid={`theme-reset-${token.cssVar}`}
            className="text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <RotateCcw className="size-3" />
          </button>
        </div>
      </div>

      {token.type === "length" ? (
        <div className="flex items-center gap-3">
          <Slider
            aria-label={token.label}
            data-testid={`theme-slider-${token.cssVar}`}
            min={token.min}
            max={token.max}
            step={token.step}
            value={[pxToNumber(value)]}
            onValueChange={(next) => {
              const n = Array.isArray(next) ? next[0] : next
              onChange(`${n}px`)
            }}
          />
          <output className="text-muted-foreground w-10 shrink-0 text-right text-xs tabular-nums">
            {pxToNumber(value)}px
          </output>
        </div>
      ) : token.type === "color" ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label={`${token.label} color picker`}
            data-testid={`theme-swatch-${token.cssVar}`}
            value={toColorInputValue(value)}
            onChange={(e) => onChange(e.target.value)}
            className="border-input size-8 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
          />
          <Input
            id={controlId}
            value={value}
            spellCheck={false}
            data-testid={`theme-input-${token.cssVar}`}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 font-mono text-xs"
          />
        </div>
      ) : (
        <Input
          id={controlId}
          value={value}
          spellCheck={false}
          data-testid={`theme-input-${token.cssVar}`}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 font-mono text-xs"
        />
      )}

      {token.hint && (
        <p className="text-muted-foreground m-0 text-[11px] leading-snug">
          {token.hint}
        </p>
      )}
    </div>
  )
}
