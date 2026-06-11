import { useId } from "react"
import { Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material"
import { EdgeTypePreviewIcon } from "./EdgeTypePreviewIcon"

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
  const labelId = useId()
  const selectedLabel = options.find((o) => o.value === value)?.label

  return (
    <FormControl fullWidth size="small">
      <InputLabel id={labelId}>Edge Type</InputLabel>
      <Select
        labelId={labelId}
        value={value ?? ""}
        label="Edge Type"
        onChange={(e) => onChange(e.target.value)}
        renderValue={() => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box component="span">{selectedLabel}</Box>
            {value && <EdgeTypePreviewIcon edgeType={value} />}
          </Box>
        )}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            <Box
              sx={{
                alignItems: "center",
                display: "flex",
                gap: 2,
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <Box component="span">{option.label}</Box>
              <EdgeTypePreviewIcon edgeType={option.value} />
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
