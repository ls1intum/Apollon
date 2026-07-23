import { useState } from "react"
import { Check, Copy, Eye, Moon, RotateCcw, Sun } from "lucide-react"
import { useShallow } from "zustand/shallow"
import { Button } from "@tumaet/ui/components/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@tumaet/ui/components/select"
import { useThemeStore } from "@/stores/useThemeStore"
import { THEME_GROUPS, type RevealContext, type ThemeTier } from "./themeTokens"
import { ThemeControl } from "./ThemeControl"
import { buildThemeSnippet } from "./buildThemeSnippet"

const TIERS: { tier: ThemeTier; label: string }[] = [
  { tier: "essential", label: "Essentials" },
  { tier: "advanced", label: "Advanced" },
  { tier: "feature", label: "Feature-specific" },
]

const REVEAL_LABEL: Record<RevealContext, string> = {
  assessment: "Switch to Assessment mode",
  collaboration: "Enable live cursors",
  highlight: "Enable highlight view",
}

export interface ThemeConfiguratorProps {
  overrides: Record<string, string>
  onChange: (cssVar: string, value: string) => void
  onReset: (cssVar: string) => void
  onResetAll: () => void
  /** Put the editor into the state where a feature group's tokens are visible. */
  onReveal: (context: RevealContext) => void
}

/**
 * The playground's theme editor. Tiered: Essentials first, then
 * Advanced, then Feature-specific groups whose tokens only show in a particular
 * editor state — those carry a "Show me" button that drives the editor into
 * that state (or a note when it can't be automated). Dark mode is driven through
 * the document `data-theme` (the mechanism that themes the whole editor).
 */
export const ThemeConfigurator = ({
  overrides,
  onChange,
  onReset,
  onResetAll,
  onReveal,
}: ThemeConfiguratorProps) => {
  const [copied, setCopied] = useState(false)
  const [activeGroupId, setActiveGroupId] = useState(THEME_GROUPS[0].id)
  const { theme, setTheme } = useThemeStore(
    useShallow((s) => ({ theme: s.currentTheme, setTheme: s.setTheme }))
  )

  const overrideCount = Object.keys(overrides).length
  const activeGroup =
    THEME_GROUPS.find((g) => g.id === activeGroupId) ?? THEME_GROUPS[0]

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(
        buildThemeSnippet(overrides, theme === "dark")
      )
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can be unavailable (permissions / insecure context); ignore.
    }
  }

  const countFor = (groupId: string) =>
    THEME_GROUPS.find((g) => g.id === groupId)!.tokens.filter(
      (t) => overrides[t.cssVar] !== undefined
    ).length

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-muted sticky -top-8 z-10 flex flex-col gap-2.5 pb-2 pt-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="m-0 text-sm font-semibold">Theme</h2>
          <span
            className="text-muted-foreground text-xs"
            data-testid="theme-override-count"
          >
            {overrideCount} override{overrideCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs font-medium">
            Appearance (document data-theme)
          </span>
          <div
            className="border-input inline-flex rounded-md border p-0.5"
            role="group"
            aria-label="Appearance"
          >
            {(
              [
                { value: "light", label: "Light", Icon: Sun },
                { value: "dark", label: "Dark", Icon: Moon },
              ] as const
            ).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={theme === value}
                data-testid={`theme-preview-${value}`}
                onClick={() => setTheme(value)}
                className={
                  "flex flex-1 items-center justify-center gap-1.5 rounded-[3px] px-2 py-1 text-xs font-medium transition-colors " +
                  (theme === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={copySnippet}
            data-testid="theme-copy"
          >
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy embed"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetAll}
            disabled={overrideCount === 0}
            data-testid="theme-reset-all"
          >
            <RotateCcw />
            Reset all
          </Button>
        </div>

        <Select
          value={activeGroupId}
          onValueChange={(value) => setActiveGroupId(value as string)}
        >
          <SelectTrigger
            className="w-full"
            data-testid="theme-section-select"
            aria-label="Section"
          >
            <span className="flex-1 text-left">
              {activeGroup.label}
              {countFor(activeGroup.id) > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  · {countFor(activeGroup.id)}
                </span>
              )}
            </span>
          </SelectTrigger>
          <SelectContent>
            {TIERS.map(({ tier, label }) => (
              <SelectGroup key={tier}>
                <SelectLabel>{label}</SelectLabel>
                {THEME_GROUPS.filter((g) => g.tier === tier).map((group) => {
                  const count = countFor(group.id)
                  return (
                    <SelectItem
                      key={group.id}
                      value={group.id}
                      data-testid={`theme-section-${group.id}`}
                    >
                      <span className="flex-1">{group.label}</span>
                      {count > 0 && (
                        <span className="bg-primary text-primary-foreground ml-2 rounded-full px-1.5 text-[10px] leading-4">
                          {count}
                        </span>
                      )}
                    </SelectItem>
                  )
                })}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className="flex flex-col"
        data-testid={`theme-panel-${activeGroup.id}`}
      >
        <p className="text-muted-foreground m-0 pb-1 text-xs leading-snug">
          {activeGroup.blurb}
        </p>

        {activeGroup.reveal && (
          <div className="border-border bg-background mb-1 flex items-center justify-between gap-2 rounded-md border p-2">
            <span className="text-muted-foreground text-[11px] leading-snug">
              These only show in a specific editor state.
            </span>
            <Button
              variant="secondary"
              size="xs"
              className="shrink-0"
              data-testid="theme-reveal"
              onClick={() => onReveal(activeGroup.reveal!)}
            >
              <Eye />
              {REVEAL_LABEL[activeGroup.reveal]}
            </Button>
          </div>
        )}

        {activeGroup.note && (
          <p className="text-muted-foreground border-border m-0 mb-1 rounded-md border border-dashed p-2 text-[11px] leading-snug">
            {activeGroup.note}
          </p>
        )}

        <div className="divide-border/60 flex flex-col divide-y">
          {activeGroup.tokens.map((token) => (
            <ThemeControl
              key={token.cssVar}
              token={token}
              override={overrides[token.cssVar]}
              onChange={(value) => onChange(token.cssVar, value)}
              onReset={() => onReset(token.cssVar)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
