import React, { useId } from "react"

// Native <input>/<textarea> styled via the `.apollon-textfield*` classes;
// props mirror the subset of MUI's TextField the codebase uses.

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
  size = "medium",
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

  const controlClassName = [
    "apollon-textfield",
    size === "small" && "apollon-textfield--small",
    error && "apollon-textfield--error",
    className,
  ]
    .filter(Boolean)
    .join(" ")

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
    className: controlClassName,
    "aria-invalid": error || undefined,
    ...rest,
  }

  return (
    <span style={wrapperStyle}>
      {label && (
        <label htmlFor={inputId} className="apollon-textfield-label">
          {label}
        </label>
      )}
      {multiline ? (
        <textarea rows={minRows} {...sharedProps} style={{ resize: "none" }} />
      ) : (
        <input type={type ?? "text"} {...sharedProps} />
      )}
      {helperText && (
        <span
          className={`apollon-textfield-helper${error ? " apollon-textfield-helper--error" : ""}`}
        >
          {helperText}
        </span>
      )}
    </span>
  )
}
