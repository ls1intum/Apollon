import type { ReactNode } from "react"

export type SegmentedControlOption<T extends string> = {
  value: T
  label?: string
  icon?: ReactNode
  ariaLabel?: string
}

type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  sizeClassName?: string
  itemClassName?: string
}

export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  className = "",
  sizeClassName = "h-9",
  itemClassName = "px-3 text-xs font-semibold",
}: SegmentedControlProps<T>) => {
  return (
    <div
      className={`inline-flex ${sizeClassName} items-center gap-[2px] rounded-lg border-0 bg-[var(--home-surface-raised)] p-[2px] ${className}`.trim()}
    >
      {options.map((option) => {
        const isSelected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`inline-flex h-full min-w-0 cursor-pointer items-center justify-center gap-1 rounded-md leading-4 ${itemClassName} transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-ring)] focus-visible:outline-offset-2 ${
              isSelected
                ? "bg-[var(--home-accent-base)] text-[var(--home-accent-contrast)]"
                : "text-[var(--home-text-secondary)] hover:bg-[color-mix(in_srgb,var(--home-surface-raised-hover)_50%,transparent)] hover:text-[var(--home-text-primary)]"
            }`}
            aria-label={option.ariaLabel}
            aria-pressed={isSelected}
          >
            {option.icon}
            {option.label ? (
              <span className="inline-flex items-center truncate">
                {option.label}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
