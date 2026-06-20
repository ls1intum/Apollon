import type { InputHTMLAttributes, ReactNode } from "react"
import type { ModalProps } from "@/types"
import { Button } from "@/components/ui/button"

export type HomeDialogSize = "compact" | "wide"

export type HomeDialogOption<T extends string> = {
  value: T
  label: string
  /** Optional preview glyph; turns the option into a centered icon tile. */
  icon?: ReactNode
}

export const isHomeDialogVariant = (props?: ModalProps | unknown) =>
  Boolean(
    props &&
      typeof props === "object" &&
      (props as ModalProps).dialogVariant === "home"
  )

export const getHomeDialogWidth = (size: HomeDialogSize) =>
  size === "wide" ? "min(620px, 92vw)" : "min(460px, 92vw)"

export const HomeDialogContent = ({
  children,
  className = "",
  testId,
}: {
  children: ReactNode
  className?: string
  testId?: string
}) => (
  <div
    data-testid={testId}
    className={`recent-diagrams-font flex min-w-0 flex-col gap-5 ${className}`.trim()}
  >
    {children}
  </div>
)

export const HomeDialogNotice = ({ children }: { children: ReactNode }) => (
  <div className="rounded-md border-l-[5px] border-l-[var(--home-accent-base)] bg-[color-mix(in_srgb,var(--home-accent-base)_12%,transparent)] p-2">
    <p className="text-sm font-normal text-[var(--home-text-primary)]">
      {children}
    </p>
  </div>
)

export const HomeDialogField = ({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: ReactNode
}) => (
  <div className="flex flex-col gap-1.5">
    {htmlFor ? (
      <label
        htmlFor={htmlFor}
        className="text-xs font-semibold text-[var(--home-text-primary)]"
      >
        {label}
      </label>
    ) : (
      <span className="text-xs font-semibold text-[var(--home-text-primary)]">
        {label}
      </span>
    )}
    {children}
  </div>
)

export const HomeDialogTextInput = (
  props: InputHTMLAttributes<HTMLInputElement>
) => (
  <input
    {...props}
    className={`h-9 w-full rounded-md border border-[var(--home-border-default)] bg-[var(--home-surface-base)] px-3 py-1.5 text-sm text-[var(--home-text-primary)] outline-none transition-colors duration-150 placeholder:text-[var(--home-text-secondary)] focus:border-[var(--home-accent-ring)] disabled:cursor-not-allowed disabled:opacity-60 ${props.className ?? ""}`.trim()}
  />
)

export const HomeDialogValueBox = ({ children }: { children: ReactNode }) => (
  <div className="h-9 rounded-md border border-[var(--home-border-default)] bg-[var(--home-surface-sunken)] px-3 py-2 text-sm font-medium text-[var(--home-text-primary)]">
    {children}
  </div>
)

export const HomeDialogOptionGroup = <T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 1,
  disabled = false,
  onConfirm,
  hideLabel = false,
}: {
  label: string
  options: readonly HomeDialogOption<T>[]
  value: T
  onChange: (value: T) => void
  columns?: 1 | 2
  disabled?: boolean
  onConfirm?: () => void
  hideLabel?: boolean
}) => {
  const headingId = `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-group`

  return (
    <section className="flex flex-col gap-2" aria-labelledby={headingId}>
      <h3
        id={headingId}
        className={
          hideLabel
            ? "sr-only"
            : "text-xs font-semibold text-[var(--home-text-primary)]"
        }
      >
        {label}
      </h3>
      <div
        className={`grid grid-cols-1 gap-2 ${columns === 2 ? "sm:grid-cols-2" : ""}`.trim()}
      >
        {options.map((option) => {
          const selected = option.value === value

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              onDoubleClick={onConfirm}
              aria-pressed={selected}
              className={`min-h-9 cursor-pointer rounded-md border text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-ring)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                option.icon
                  ? "flex flex-col items-center gap-2 px-3 py-3 text-center"
                  : "px-3 py-2 text-left"
              } ${
                selected
                  ? "border-[var(--home-accent-base)] bg-[var(--home-accent-soft)] text-[var(--home-accent-strong)]"
                  : "border-[var(--home-border-default)] bg-[var(--home-surface-raised)] text-[var(--home-text-primary)] hover:bg-[var(--home-surface-raised-hover)]"
              }`}
            >
              {option.icon}
              {option.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export const HomeDialogActions = ({
  cancelLabel = "Cancel",
  confirmLabel,
  loadingLabel,
  loading = false,
  confirmDisabled = false,
  onCancel,
  onConfirm,
}: {
  cancelLabel?: string
  confirmLabel: string
  loadingLabel?: string
  loading?: boolean
  confirmDisabled?: boolean
  onCancel: () => void
  onConfirm: () => void
}) => (
  <div className="flex items-center justify-between gap-2 pt-4">
    <Button variant="ghost" disabled={loading} onClick={onCancel}>
      {cancelLabel}
    </Button>
    <Button
      variant="default"
      disabled={loading || confirmDisabled}
      onClick={onConfirm}
    >
      {loading && loadingLabel ? loadingLabel : confirmLabel}
    </Button>
  </div>
)
