import React, { useId } from "react"
import { Input } from "@tumaet/ui/components/input"
import { Textarea } from "@tumaet/ui/components/textarea"

// Compatibility wrapper: the control (input / textarea) is now the shared
// @tumaet/ui primitive (styling ships in the bundled, Tailwind-free
// components.css via data-slot="input"/"textarea"), while the label + helper
// chrome are token-driven elements (styled in app.css via
// data-slot="textfield-label"/"textfield-helper") so the public API
// (label, helperText, multiline, error, …) the editor relies on is unchanged.

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
  size?: "small" | "medium"
  fullWidth?: boolean
  multiline?: boolean
  minRows?: number
  maxRows?: number
  maxLength?: number
  error?: boolean
  helperText?: React.ReactNode
  /** MUI-only; accepted for compatibility, ignored. */
  variant?: string
  sx?: React.CSSProperties
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
  // accepted for MUI compat; the shared control owns its sizing
  size: _size = "medium",
  fullWidth,
  multiline,
  minRows,
  // accepted for MUI compat; native <textarea> has no auto-grow
  maxRows: _maxRows,
  maxLength,
  error,
  helperText,
  variant: _variant,
  sx,
  className,
  style,
  ...rest
}) => {
  const generatedId = useId()
  const inputId = id ?? generatedId

  const wrapperStyle: React.CSSProperties = {
    display: "inline-flex",
    flexDirection: "column",
    width: fullWidth ? "100%" : undefined,
    ...sx,
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
        <Textarea rows={minRows} {...sharedProps} style={{ resize: "none" }} />
      ) : (
        <Input type={type ?? "text"} {...sharedProps} />
      )}
      {helperText && (
        <span data-slot="textfield-helper" data-error={error || undefined}>
          {helperText}
        </span>
      )}
    </span>
  )
}
