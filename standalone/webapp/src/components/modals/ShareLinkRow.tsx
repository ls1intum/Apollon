import { useEffect, useRef, useState } from "react"
import { Tooltip } from "@mui/material"
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

const CopyIcon = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden="true"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const CheckIcon = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * The share-link control: a read-only link field, an explicit copy button with a
 * transient "copied" check, and a dropdown that switches the access mode. Shared
 * by the editor and dashboard share dialogs so both behave identically.
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
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const activeLabel = options.find((o) => o.value === mode)?.label ?? "Edit"

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current
          .closest("[data-mode-dropdown]")
          ?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [open])

  const select = (next: DiagramView) => {
    onSelectMode(next)
    setOpen(false)
  }

  return (
    <div className="flex items-stretch">
      <input
        type="text"
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

      <Tooltip
        title={
          <span className="recent-diagrams-font">
            {copied ? "Copied!" : "Copy link"}
          </span>
        }
        placement="top"
        arrow
      >
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
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </Tooltip>

      <div className="relative" data-mode-dropdown="">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 items-center gap-1.5 rounded-r-md border px-3 text-xs font-medium transition-colors duration-150 hover:opacity-80"
          style={{
            borderColor: "var(--home-border-default)",
            background: "var(--home-surface-raised)",
            color: "var(--home-text-primary)",
            minWidth: "max-content",
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          {activeLabel}
          <svg
            className="h-3 w-3 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden="true"
          >
            <path
              d="M6 9l6 6 6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {open && (
          <ul
            role="listbox"
            className="absolute right-0 top-full z-10 mt-1 min-w-[160px] rounded-lg border p-1"
            style={{
              borderColor: "var(--home-border-default)",
              background: "var(--home-surface-raised)",
              boxShadow: "0 8px 24px var(--home-shadow-overlay)",
            }}
          >
            {options.map((opt) => {
              const selected = mode === opt.value
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={selected}
                  onClick={() => select(opt.value)}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors duration-100"
                  style={{
                    background: selected
                      ? "var(--home-accent-soft)"
                      : "transparent",
                    color: selected
                      ? "var(--home-accent-strong)"
                      : "var(--home-text-primary)",
                  }}
                >
                  {selected && <CheckIcon />}
                  <span className={selected ? "" : "pl-6"}>{opt.label}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
