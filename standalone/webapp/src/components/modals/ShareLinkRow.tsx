import { Check, Copy } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tumaet/ui/components/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@tumaet/ui/components/tooltip"
import { DiagramView } from "@/types"

export type ShareModeOption = { value: DiagramView; label: string }

/**
 * The access modes a shared link can carry, shared by both share dialogs.
 * Collaborate leads (and is the default) — sharing a diagram is most often an
 * invitation to work on it together; Edit follows for a private working copy.
 */
export const MODE_OPTIONS: readonly ShareModeOption[] = [
  { value: DiagramView.COLLABORATE, label: "Collaborate" },
  { value: DiagramView.EDIT, label: "Edit" },
  { value: DiagramView.GIVE_FEEDBACK, label: "Add feedback" },
  { value: DiagramView.SEE_FEEDBACK, label: "View feedback" },
]

/**
 * The share-link control: a read-only link field, an explicit copy button with a
 * transient "copied" check, and a `Select` that switches the access mode. Shared
 * by the editor and dashboard share dialogs so both behave identically. The mode
 * switch is the `Select` primitive (portaled, keyboard-navigable) rather than a
 * hand-rolled list — the three controls read as one segmented input group.
 */
export const ShareLinkRow = ({
  link,
  copied,
  onCopy,
  mode,
  options,
  onSelectMode,
}: {
  link: string
  copied: boolean
  onCopy: () => void
  mode: DiagramView
  options: readonly ShareModeOption[]
  onSelectMode: (mode: DiagramView) => void
}) => {
  return (
    <div className="flex items-stretch">
      <input
        type="text"
        aria-label="Shareable link"
        value={link}
        readOnly
        onFocus={(e) => e.currentTarget.select()}
        className="h-9 min-w-0 grow rounded-l-md border border-r-0 px-3 text-xs outline-none"
        style={{
          borderColor: "var(--home-border-default)",
          background: "var(--home-surface-sunken)",
          color: "var(--home-text-secondary)",
        }}
      />

      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={onCopy}
              className="flex h-9 w-9 shrink-0 items-center justify-center border border-r-0 transition-colors duration-150 hover:opacity-80"
              style={{
                borderColor: "var(--home-border-default)",
                background: copied
                  ? "var(--home-accent-soft)"
                  : "var(--home-surface-raised)",
                color: copied
                  ? "var(--home-accent-base)"
                  : "var(--home-text-secondary)",
              }}
              aria-label="Copy link"
            >
              {copied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
            </button>
          }
        />
        <TooltipContent side="top">
          <span>{copied ? "Copied!" : "Copy link"}</span>
        </TooltipContent>
      </Tooltip>

      <Select
        value={mode}
        onValueChange={(value) => onSelectMode(value as DiagramView)}
      >
        <SelectTrigger
          aria-label="Link access mode"
          className="gap-1.5 border px-3 text-xs font-medium transition-colors duration-150 hover:opacity-80"
          style={{
            height: "2.25rem",
            borderRadius: "0 0.375rem 0.375rem 0",
            borderColor: "var(--home-border-default)",
            background: "var(--home-surface-raised)",
            color: "var(--home-text-primary)",
            minWidth: "max-content",
          }}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
