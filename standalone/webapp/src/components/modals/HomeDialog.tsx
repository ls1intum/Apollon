import type { InputHTMLAttributes, ReactNode } from "react"
import type { ModalProps } from "@/types"
import { Button } from "@tumaet/ui/components/button"
import { DialogFooter } from "@tumaet/ui/components/dialog"
import { Input } from "@tumaet/ui/components/input"
import { Field, FieldLabel } from "@tumaet/ui/components/field"
import { Alert, AlertDescription } from "@tumaet/ui/components/alert"
import { ModalFooterPortal } from "@/wrappers/ModalFrame"

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
    className={`flex min-w-0 flex-col gap-5 ${className}`.trim()}
  >
    {children}
  </div>
)

export const HomeDialogNotice = ({ children }: { children: ReactNode }) => (
  <Alert className="border-l-[5px] border-l-primary bg-accent-soft p-2">
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
  // Icon tiles are a compact, scannable grid that never collapses to a single
  // column in portrait — 2-up by default, 3-up from 480px. Text-only options
  // keep their row layout (honouring the `columns` prop). #audit-create-grid.
  const hasIcons = options.some((option) => option.icon)

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
        className={
          hasIcons
            ? "grid grid-cols-2 gap-2 min-[480px]:grid-cols-3"
            : `grid grid-cols-1 gap-2 ${columns === 2 ? "sm:grid-cols-2" : ""}`.trim()
        }
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
              className={`cursor-pointer rounded-md border transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                option.icon
                  ? "flex flex-col items-center justify-center gap-1.5 px-2 py-2.5 text-center text-xs font-medium"
                  : "min-h-9 px-3 py-2 text-left text-sm font-medium"
              } ${
                selected
                  ? "border-primary bg-accent-soft text-accent-strong"
                  : "border-border bg-card text-foreground hover:bg-accent-hover"
              }`}
            >
              {option.icon}
              <span className="line-clamp-2">{option.label}</span>
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
  // Portals into ModalFrame's pinned footer slot (a sibling AFTER the scroll
  // body) so the action bar stays clickable in portrait without scrolling.
  // Outside a frame (standalone Storybook block) it renders in flow.
  <ModalFooterPortal>
    <DialogFooter>
      <Button variant="outline" disabled={loading} onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button
        variant="default"
        disabled={loading || confirmDisabled}
        onClick={onConfirm}
      >
        {loading && loadingLabel ? loadingLabel : confirmLabel}
      </Button>
    </DialogFooter>
  </ModalFooterPortal>
)
