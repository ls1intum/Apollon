import React, { useId } from "react"
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox"
import { Check } from "lucide-react"

// Tailwind-free checkbox on Base UI's Checkbox (like the rest of library/ui),
// rendering data-slot="checkbox"/"checkbox-indicator" styled in app.css via
// data-checked/data-disabled + --apollon-* tokens. An optional `label` wraps
// the box in a clickable row; without one, pass `aria-label` for a name.

export interface CheckboxProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  label?: React.ReactNode
  disabled?: boolean
  id?: string
  name?: string
  "aria-label"?: string
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  defaultChecked,
  onCheckedChange,
  label,
  disabled,
  id,
  name,
  "aria-label": ariaLabel,
}) => {
  const generatedId = useId()
  const inputId = id ?? generatedId

  const box = (
    <BaseCheckbox.Root
      id={inputId}
      name={name}
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={(next) => onCheckedChange?.(next)}
      disabled={disabled}
      aria-label={label ? undefined : ariaLabel}
      data-slot="checkbox"
    >
      <BaseCheckbox.Indicator data-slot="checkbox-indicator">
        <Check width={12} height={12} aria-hidden="true" />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  )

  if (!label) return box

  return (
    <label htmlFor={inputId} data-slot="checkbox-label">
      {box}
      <span>{label}</span>
    </label>
  )
}
