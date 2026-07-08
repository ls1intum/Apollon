import React, { useId } from "react"
import { Input } from "@tumaet/ui/components/input"
import { Textarea } from "@tumaet/ui/components/textarea"

// Wraps the shared @tumaet/ui Input/Textarea (styled in the bundled, Tailwind-free
// components.css via data-slot="input"/"textarea") with a token-driven label +
// helper chrome (styled in app.css via
// data-slot="textfield-label"/"textfield-helper"), exposing one
// (label, helperText, multiline, error, …) API for the editor's forms.

// Intersection so handlers get a `target` with `.value` for either element.
type TextFieldElement = HTMLInputElement & HTMLTextAreaElement

export interface TextFieldProps {
  value?: string | number
  defaultValue?: string | number
  onChange?: (event: React.ChangeEvent<TextFieldElement>) => void
  onKeyDown?: (event: React.KeyboardEvent<TextFieldElement>) => void
  onBlur?: (event: React.FocusEvent<TextFieldElement>) => void
  onFocus?: (event: React.FocusEvent<TextFieldElement>) => void
  placeholder?: string
  label?: React.ReactNode
  name?: string
  id?: string
  type?: React.HTMLInputTypeAttribute
  disabled?: boolean
  autoFocus?: boolean
  fullWidth?: boolean
  multiline?: boolean
  minRows?: number
  maxLength?: number
  error?: boolean
  helperText?: React.ReactNode
  className?: string
  style?: React.CSSProperties
  /** Accessible name for the control when no visible `label` is rendered. */
  "aria-label"?: string
  /** Forwarded to the control (e.g. `data-field` for focus management). */
  [dataAttr: `data-${string}`]: unknown
}

export const TextField: React.FC<TextFieldProps> = ({
  value,
  defaultValue,
  onChange,
  onKeyDown,
  onBlur,
  onFocus,
  placeholder,
  label,
  name,
  id,
  type,
  disabled,
  autoFocus,
  fullWidth,
  multiline,
  minRows,
  maxLength,
  error,
  helperText,
  className,
  style,
  ...rest
}) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const helperId = helperText ? `${inputId}-helper` : undefined

  const wrapperStyle: React.CSSProperties = {
    display: "inline-flex",
    flexDirection: "column",
    width: fullWidth ? "100%" : undefined,
    ...style,
  }

  const sharedProps = {
    id: inputId,
    name,
    value,
    defaultValue,
    placeholder,
    disabled,
    autoFocus,
    maxLength,
    onChange: onChange as React.ChangeEventHandler<TextFieldElement>,
    onKeyDown: onKeyDown as React.KeyboardEventHandler<TextFieldElement>,
    onBlur: onBlur as React.FocusEventHandler<TextFieldElement>,
    onFocus: onFocus as React.FocusEventHandler<TextFieldElement>,
    className,
    "aria-invalid": error || undefined,
    "aria-describedby": helperId,
    ...rest,
  }

  return (
    <span style={wrapperStyle}>
      {label && (
        <label htmlFor={inputId} data-slot="textfield-label">
          {label}
        </label>
      )}
      {multiline ? (
        // `field-sizing: content` (set on the shared textarea) auto-grows the
        // box; these inline floors override the components.css min-height so a
        // minRows={1} field starts single-line (≈ the <input> height) and grows
        // one line per newline, capped at 12 lines with internal scroll.
        <Textarea
          rows={minRows}
          {...sharedProps}
          style={{
            resize: "none",
            minHeight: `calc(${minRows ?? 1} * 1lh + 1rem)`,
            maxHeight: "12lh",
            overflowY: "auto",
          }}
        />
      ) : (
        <Input type={type ?? "text"} {...sharedProps} />
      )}
      {helperText && (
        <span
          id={helperId}
          data-slot="textfield-helper"
          data-error={error || undefined}
        >
          {helperText}
        </span>
      )}
    </span>
  )
}
