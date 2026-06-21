import { Checkbox, FormControlLabel, FormGroup } from "@mui/material"
import { useDiagramStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { PopoverProps } from "../types"
import { DefaultNodeEditPopover } from "../DefaultNodeEditPopover"
import { DividerLine } from "@/components"
import { ErAttributeProps } from "@/types"
import { useErNodeDataUpdate } from "./useErNodeDataUpdate"

export const ErAttributeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const nodes = useDiagramStore(useShallow((state) => state.nodes))
  const updateData = useErNodeDataUpdate(elementId)

  const node = nodes.find((n) => n.id === elementId)
  if (!node) {
    return null
  }
  const data = node.data as ErAttributeProps

  const flag = (label: string, key: keyof ErAttributeProps) => (
    <FormControlLabel
      control={
        <Checkbox
          size="small"
          checked={!!data[key]}
          onChange={(e) => {
            // Key and partial key are mutually exclusive (an attribute is at
            // most one of them); clear the sibling when enabling either.
            if (key === "isKey" && e.target.checked) {
              updateData({ isKey: true, isPartialKey: false })
            } else if (key === "isPartialKey" && e.target.checked) {
              updateData({ isPartialKey: true, isKey: false })
            } else {
              updateData({ [key]: e.target.checked })
            }
          }}
        />
      }
      label={label}
    />
  )

  return (
    <DefaultNodeEditPopover elementId={elementId}>
      <DividerLine />
      <FormGroup sx={{ mt: 1 }}>
        {flag("Key", "isKey")}
        {flag("Partial key", "isPartialKey")}
        {flag("Multivalued", "isMultivalued")}
        {flag("Derived", "isDerived")}
      </FormGroup>
    </DefaultNodeEditPopover>
  )
}
