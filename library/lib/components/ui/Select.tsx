import React, { useCallback, useEffect, useId, useRef, useState } from "react"
import { Popover } from "@base-ui/react/popover"
import { ChevronDown } from "lucide-react"
import { resolveApollonThemeVars } from "./portalTheme"
import { useLabels } from "@/i18n/useLabels"

export interface SelectOption {
  value: string
  label: string
  /** Row content in the open list (defaults to `label`). */
  renderOption?: () => React.ReactNode
  /** Collapsed-trigger content (defaults to `label`). */
  renderValue?: () => React.ReactNode
}

export interface SelectProps {
  value?: string
  onChange: (value: string) => void
  options: ReadonlyArray<SelectOption>
  label?: React.ReactNode
  placeholder?: string
  fullWidth?: boolean
  disabled?: boolean
  id?: string
  "aria-label"?: string
}

// Base UI Popover + `role="listbox"` rather than a select primitive: this
// preserves the custom Capacitor-friendly scroll/pointer behavior and still
// allows arbitrary per-option content (preview icons).
export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  label,
  placeholder,
  fullWidth = true,
  disabled,
  id,
  "aria-label": ariaLabel,
}) => {
  const t = useLabels()
  const generatedId = useId()
  const triggerId = id ?? generatedId
  const listboxId = `${triggerId}-listbox`

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number>(() =>
    Math.max(
      0,
      options.findIndex((o) => o.value === value)
    )
  )
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const typeahead = useRef<{ query: string; at: number }>({ query: "", at: 0 })

  // The listbox portals to <body>, escaping the `.apollon-editor` subtree that
  // scopes `--apollon-*`; copy the resolved theme onto the popup so a dark or
  // custom embed theme carries into the open menu. Resolved at open time (off
  // the trigger), so a body portal still paints with the editor's theme.
  const [portalThemeVars, setPortalThemeVars] = useState<React.CSSProperties>(
    {}
  )

  const selected = options.find((o) => o.value === value)

  // Focus the selected option on the open transition only; re-running on
  // `options`/`value` identity would yank focus back during keyboard nav.
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open && !wasOpen.current) {
      const idx = Math.max(
        0,
        options.findIndex((o) => o.value === value)
      )
      setActiveIndex(idx)
      requestAnimationFrame(() => optionRefs.current[idx]?.focus())
    }
    wasOpen.current = open
  }, [open, options, value])

  const commit = useCallback(
    (next: string) => {
      onChange(next)
      setOpen(false)
    },
    [onChange]
  )

  const moveActive = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(options.length - 1, next))
      setActiveIndex(clamped)
      optionRefs.current[clamped]?.focus()
    },
    [options.length]
  )

  const onListKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          moveActive(activeIndex + 1)
          break
        case "ArrowUp":
          e.preventDefault()
          moveActive(activeIndex - 1)
          break
        case "Home":
          e.preventDefault()
          moveActive(0)
          break
        case "End":
          e.preventDefault()
          moveActive(options.length - 1)
          break
        case "Enter":
        case " ":
          e.preventDefault()
          commit(options[activeIndex].value)
          break
        default: {
          // Type-ahead by label prefix.
          if (e.key.length !== 1) return
          const now = Date.now()
          const query =
            now - typeahead.current.at < 600
              ? typeahead.current.query + e.key
              : e.key
          typeahead.current = { query, at: now }
          const lower = query.toLowerCase()
          const match = options.findIndex((o) =>
            o.label.toLowerCase().startsWith(lower)
          )
          if (match >= 0) moveActive(match)
        }
      }
    },
    [activeIndex, commit, moveActive, options]
  )

  return (
    <span
      className="apollon-select"
      style={{ width: fullWidth ? "100%" : undefined }}
    >
      {label && (
        <label htmlFor={triggerId} className="apollon-select-label">
          {label}
        </label>
      )}
      <Popover.Root
        open={open}
        onOpenChange={(next: boolean) => {
          if (next)
            setPortalThemeVars(resolveApollonThemeVars(triggerRef.current))
          setOpen(next)
        }}
      >
        <Popover.Trigger
          render={
            <button
              ref={triggerRef}
              type="button"
              id={triggerId}
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={open ? listboxId : undefined}
              aria-label={ariaLabel}
              disabled={disabled}
              className="apollon-select-trigger"
            >
              <span className="apollon-select-value">
                {selected ? (
                  (selected.renderValue?.() ?? selected.label)
                ) : (
                  <span className="apollon-select-placeholder">
                    {placeholder ?? t.selectPlaceholder}
                  </span>
                )}
              </span>
              <ChevronDown
                size={16}
                aria-hidden
                className="apollon-select-icon"
              />
            </button>
          }
        />
        <Popover.Portal>
          <Popover.Positioner align="start" sideOffset={4} collisionPadding={8}>
            <Popover.Popup
              initialFocus={false}
              className="apollon-select-content"
              style={{
                ...portalThemeVars,
                width: "var(--anchor-width)",
                maxHeight: "min(320px, var(--available-height))",
              }}
            >
              <div
                id={listboxId}
                role="listbox"
                aria-label={ariaLabel}
                className="apollon-select-listbox"
                onKeyDown={onListKeyDown}
              >
                {options.map((option, index) => {
                  const isSelected = option.value === value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={index === activeIndex ? 0 : -1}
                      ref={(el) => {
                        optionRefs.current[index] = el
                      }}
                      className={`apollon-select-option${
                        isSelected ? " apollon-select-option--selected" : ""
                      }`}
                      onClick={() => commit(option.value)}
                    >
                      {option.renderOption?.() ?? option.label}
                    </button>
                  )
                })}
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </span>
  )
}
