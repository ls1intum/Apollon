import { useMemo } from "react"
import { Select, type SelectOption } from "@/components/ui"
import { EdgeTypePreviewIcon } from "./EdgeTypePreviewIcon"

// Label + preview-icon row shared by the option list and the collapsed value.
const EdgeTypeRow = ({
  label,
  edgeType,
  gap,
  justify,
}: {
  label: string
  edgeType: string
  gap: number
  justify?: "space-between"
}) => (
  <span
    style={{
      alignItems: "center",
      display: "flex",
      gap,
      justifyContent: justify,
      width: justify ? "100%" : undefined,
    }}
  >
    <span>{label}</span>
    <EdgeTypePreviewIcon edgeType={edgeType} />
  </span>
)

export interface EdgeTypeOption {
  value: string
  label: string
}

// Shared "Edge Type" dropdown; each option (and the collapsed selection)
// previews how that type renders — see EdgeTypePreviewIcon.
export const EdgeTypeSelect = ({
  value,
  options,
  onChange,
}: {
  value?: string
  options: ReadonlyArray<EdgeTypeOption>
  onChange: (value: string) => void
}) => {
  const selectOptions: SelectOption[] = useMemo(
    () =>
      options.map((option) => ({
        value: option.value,
        label: option.label,
        renderOption: () => (
          <EdgeTypeRow
            label={option.label}
            edgeType={option.value}
            gap={16}
            justify="space-between"
          />
        ),
        renderValue: () => (
          <EdgeTypeRow label={option.label} edgeType={option.value} gap={8} />
        ),
      })),
    [options]
  )

  return (
    <Select
      label="Edge Type"
      aria-label="Edge Type"
      value={value}
      options={selectOptions}
      onChange={onChange}
    />
  )
}
