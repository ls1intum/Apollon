import { ToggleButton, ToggleButtonGroup } from "@mui/material"
import { useDiagramStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { PopoverProps } from "../types"
import { DefaultNodeEditPopover } from "../DefaultNodeEditPopover"
import { DividerLine } from "@/components"
import { ErEntityKind, ErEntityProps } from "@/types"
import { useErNodeDataUpdate } from "./useErNodeDataUpdate"

export const ErEntityEditPopover: React.FC<PopoverProps> = ({ elementId }) => {
  const nodes = useDiagramStore(useShallow((state) => state.nodes))
  const updateData = useErNodeDataUpdate(elementId)

  const node = nodes.find((n) => n.id === elementId)
  if (!node) {
    return null
  }
  const data = node.data as ErEntityProps

  return (
    <DefaultNodeEditPopover elementId={elementId}>
      <DividerLine />
      <ToggleButtonGroup
        exclusive
        size="small"
        value={data.kind}
        onChange={(_, value: ErEntityKind | null) =>
          value && updateData({ kind: value })
        }
        sx={{ mt: 1 }}
      >
        <ToggleButton value={ErEntityKind.Strong}>Strong</ToggleButton>
        <ToggleButton value={ErEntityKind.Weak}>Weak</ToggleButton>
      </ToggleButtonGroup>
    </DefaultNodeEditPopover>
  )
}
