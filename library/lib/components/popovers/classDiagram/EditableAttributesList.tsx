import React, { useState, KeyboardEvent, ChangeEvent } from "react"
import { Box } from "@mui/material"
import { NodeStyleEditor, TextField, Typography } from "@/components/ui"
import { generateUUID } from "@/utils"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { ClassNodeProps } from "@/types"
import { DeleteIcon } from "@/components/Icon"

interface Props {
  nodeId: string
}

export const EditableAttributeList: React.FC<Props> = ({ nodeId }) => {
  const { nodes, setNodes } = useDiagramStore(
    useShallow((state) => ({ setNodes: state.setNodes, nodes: state.nodes }))
  )
  const [newItem, setNewItem] = useState("")
  const nodeData = nodes.find((node) => node.id === nodeId)
    ?.data as ClassNodeProps | undefined
  const attributes = nodeData?.attributes ?? []

  const handleAttributeChange = (id: string, key: string, newName: string) => {
    const updatedItems = attributes.map((item) =>
      item.id === id ? { ...item, [key]: newName } : item
    )
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              attributes: updatedItems,
            },
          }
        }
        return node
      })
    )
  }

  const handleItemDelete = (id: string) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              attributes: attributes.filter((item) => item.id !== id),
            },
            height: node.height! - 30,
            measured: {
              ...node.measured,
              height: node.height! - 30,
            },
          }
        }
        return node
      })
    )
  }

  const handleAddItem = () => {
    if (newItem.trim() === "") return
    const newAttribute = { id: generateUUID(), name: newItem }
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              attributes: [...attributes, newAttribute],
            },
            height: node.height! + 30,
            measured: {
              ...node.measured,
              height: node.height! + 30,
            },
          }
        }
        return node
      })
    )

    setNewItem("")
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleAddItem()
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <Typography variant="h6">Attributes</Typography>
      {attributes.map((item) => (
        <Box
          key={item.id}
          sx={{
            display: "flex",
            gap: 0.5,
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <NodeStyleEditor
            noStrokeUpdate
            nodeData={item}
            handleDataFieldUpdate={(key, value) =>
              handleAttributeChange(item.id, key, value)
            }
            sideElements={[
              <DeleteIcon
                key={`delete_${item.id}`}
                width={16}
                height={16}
                style={{ cursor: "pointer" }}
                onClick={() => handleItemDelete(item.id)}
              />,
            ]}
          />
        </Box>
      ))}
      <TextField
        size="small"
        fullWidth
        variant="outlined"
        placeholder="+ Add attribute"
        value={newItem}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setNewItem(e.target.value)
        }
        onBlur={() => {
          if (newItem.trim() === "") {
            setNewItem("")
          } else {
            handleAddItem()
          }
        }}
        onKeyDown={handleKeyDown}
      />
    </Box>
  )
}
