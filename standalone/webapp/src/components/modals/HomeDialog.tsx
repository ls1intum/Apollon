import type { InputHTMLAttributes, ReactNode } from "react"
import type { ModalProps } from "@/types"
import { Button } from "@tumaet/ui/components/button"
import { Input } from "@tumaet/ui/components/input"
import { Field, FieldLabel } from "@tumaet/ui/components/field"
import { Alert, AlertDescription } from "@tumaet/ui/components/alert"

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
  <Alert className="border-l-[5px] border-l-primary bg-[color-mix(in_srgb,var(--home-accent-base)_12%,transparent)] p-2">
    <AlertDescription className="text-sm font-normal text-foreground">
      {children}
    </AlertDescription>
  </Alert>
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
  <Field className="gap-1.5">
    {htmlFor ? (
      <FieldLabel
        htmlFor={htmlFor}
        className="text-xs font-semibold text-foreground"
      >
        {label}
      </FieldLabel>
    ) : (
      <span className="text-xs font-semibold text-foreground">{label}</span>
    )}
    {children}
  </Field>
)

export const HomeDialogTextInput = (
  props: InputHTMLAttributes<HTMLInputElement>
) => (
  <Input
    {...props}
    className={`h-9 rounded-md border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60 ${props.className ?? ""}`.trim()}
  />
)

export const HomeDialogValueBox = ({ children }: { children: ReactNode }) => (
  <div className="h-9 rounded-md border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground">
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
          hideLabel ? "sr-only" : "text-xs font-semibold text-foreground"
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
              className={`min-h-9 cursor-pointer rounded-md border text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                option.icon
                  ? "flex flex-col items-center gap-2 px-3 py-3 text-center"
                  : "px-3 py-2 text-left"
              } ${
                selected
                  ? "border-primary bg-accent-soft text-accent-strong"
                  : "border-border bg-card text-foreground hover:bg-accent-hover"
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
