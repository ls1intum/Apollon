import { useState } from "react"
import { Box } from "@mui/material"
import { TextField } from "@/components/ui"
import { PopoverProps } from "../types"
import { useDiagramStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { Node } from "@xyflow/react"
import { BPMNPoolProps } from "@/types"

export const BPMNPoolEditPopover = ({ elementId }: PopoverProps) => {
  const { nodes, setNodes } = useDiagramStore(
    useShallow((state) => ({
      nodes: state.nodes,
      setNodes: state.setNodes,
    }))
  )

  const poolNode = nodes.find(
    (node) => node.id === elementId
  ) as Node<BPMNPoolProps>

  if (!poolNode) {
    return null
  }

  const [poolName, setPoolName] = useState(poolNode.data.name)

  const handlePoolNameChange = (value: string) => {
    setPoolName(value)

    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === elementId) {
          return {
            ...node,
            data: {
              ...node.data,
              name: value,
            },
          }
        }

        return node
      })
    )
  }

  return (
    <Box sx={{ width: "auto", padding: 2 }}>
      <TextField
        fullWidth
        label="Pool Name"
        value={poolName}
        onChange={(e) => handlePoolNameChange(e.target.value)}
        variant="outlined"
        size="small"
      />
    </Box>
  )
}
