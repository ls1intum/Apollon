import React, { useState, KeyboardEvent, ChangeEvent } from "react"
import { Box } from "@mui/material"
import { NodeStyleEditor, TextField } from "@/components/ui"
import { generateUUID } from "@/utils"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { SfcActionTableProps, SfcActionRow } from "@/types"
import { PopoverProps } from "../types"
import { LAYOUT } from "@/constants"
import { DeleteIcon } from "@/components/Icon"
import { useReactFlow } from "@xyflow/react"

export const SfcActionTableEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { updateNodeData } = useReactFlow()
  const { nodes, setNodes } = useDiagramStore(
    useShallow((state) => ({ setNodes: state.setNodes, nodes: state.nodes }))
  )
  const [newIdentifier, setNewIdentifier] = useState("")
  const [newName, setNewName] = useState("")

  const nodeData = nodes.find((node) => node.id === elementId)
    ?.data as SfcActionTableProps
  const actionRows = nodeData?.actionRows || []

  const handleRowChange = (
    id: string,
    key: keyof SfcActionRow,
    newValue: string
  ) => {
    const updatedRows = actionRows.map((row) =>
      row.id === id ? { ...row, [key]: newValue } : row
    )
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === elementId) {
          return {
            ...node,
            data: {
              ...node.data,
              actionRows: updatedRows,
            },
          }
        }
        return node
      })
    )
  }

  const handleRowDelete = (id: string) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === elementId) {
          return {
            ...node,
            data: {
              ...node.data,
              actionRows: actionRows.filter((row) => row.id !== id),
            },
            height: node.height! - LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT,
            measured: {
              ...node.measured,
              height: node.height! - LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT,
            },
          }
        }
        return node
      })
    )
  }

  const handleAddRow = () => {
    if (newIdentifier.trim() === "" && newName.trim() === "") return

    const newRow: SfcActionRow = {
      id: generateUUID(),
      identifier: newIdentifier.trim(),
      name: newName.trim(),
    }

    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === elementId) {
          return {
            ...node,
            data: {
              ...node.data,
              actionRows: [...actionRows, newRow],
            },
            height: node.height! + LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT,
            measured: {
              ...node.measured,
              height: node.height! + LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT,
            },
          }
        }
        return node
      })
    )

    setNewIdentifier("")
    setNewName("")
  }

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement | HTMLDivElement>,
    field: "identifier" | "name"
  ) => {
    if (event.key === "Enter") {
      if (field === "identifier") {
        // Move focus to name field
        const nameInput = document.querySelector(
          '[data-field="name"][data-new="true"]'
        ) as HTMLInputElement
        nameInput?.focus()
      } else {
        // Add the row
        handleAddRow()
      }
    }
  }

  const handleDataFieldUpdate = (key: string, value: string) => {
    updateNodeData(elementId, {
      ...nodeData,
      [key]: value,
    })
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <NodeStyleEditor
        title="Actions"
        nodeData={nodeData}
        handleDataFieldUpdate={handleDataFieldUpdate}
        showNameInputChange={false}
      />
      {actionRows.map((row) => (
        <Box
          key={row.id}
          sx={{
            display: "flex",
            gap: 0.5,
            alignItems: "center",
          }}
        >
          <NodeStyleEditor
            nodeData={row}
            handleDataFieldUpdate={(key, value) => {
              handleRowChange(row.id, key, value)
            }}
            sideElements={[
              <DeleteIcon
                key={`${row.id}-delete`}
                width={16}
                height={16}
                style={{ cursor: "pointer" }}
                onClick={() => handleRowDelete(row.id)}
              />,
            ]}
            preElements={[
              <TextField
                key={`${row.id}-identifier`}
                size="small"
                value={row.identifier}
                placeholder="ID"
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleRowChange(row.id, "identifier", e.target.value)
                }
                sx={{
                  width: "60px",
                }}
              />,
            ]}
            inputPlaceholder="Description"
          />
        </Box>
      ))}

      <Box
        sx={{
          display: "flex",
          gap: 0.5,
          alignItems: "center",
        }}
      >
        <TextField
          size="small"
          placeholder="ID"
          value={newIdentifier}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setNewIdentifier(e.target.value)
          }
          onBlur={() => {
            if (newIdentifier.trim() === "" && newName.trim() === "") {
              setNewIdentifier("")
            } else if (newIdentifier.trim() !== "" && newName.trim() !== "") {
              handleAddRow()
            }
          }}
          onKeyDown={(e) => handleKeyDown(e, "identifier")}
          data-field="identifier"
          data-new="true"
          sx={{
            backgroundColor: "#fff",
            width: "60px",
          }}
        />
        <TextField
          size="small"
          fullWidth
          placeholder="+ Add action name"
          value={newName}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setNewName(e.target.value)
          }
          onBlur={() => {
            if (newIdentifier.trim() === "" && newName.trim() === "") {
              setNewName("")
            } else if (newIdentifier.trim() !== "" && newName.trim() !== "") {
              handleAddRow()
            }
          }}
          onKeyDown={(e) => handleKeyDown(e, "name")}
          data-field="name"
          data-new="true"
          sx={{
            backgroundColor: "#fff",
          }}
        />
      </Box>
    </Box>
  )
}
