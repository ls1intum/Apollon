import React, { useState, KeyboardEvent, ChangeEvent } from "react"
import { Plus, Trash2 } from "lucide-react"
import { IconButton, TextField } from "@/components/ui"
import { NodeStyleEditor } from "@/components/styleEditor"
import { generateUUID } from "@/utils"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { SfcActionTableProps, SfcActionRow } from "@/types"
import { PopoverProps } from "../types"
import { LAYOUT } from "@/constants"
import { useReactFlow } from "@xyflow/react"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"

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
    <PopoverLayout title="Action Table">
      <NodeStyleEditor
        nodeData={nodeData}
        handleDataFieldUpdate={handleDataFieldUpdate}
        showNameInputChange={false}
      />
      <PopoverSection title="Actions" divider>
        {actionRows.map((row) => (
          <div
            key={row.id}
            style={{
              display: "flex",
              gap: 4,
              alignItems: "center",
            }}
          >
            <NodeStyleEditor
              nodeData={row}
              handleDataFieldUpdate={(key, value) => {
                handleRowChange(row.id, key, value)
              }}
              sideElements={[
                <IconButton
                  key={`${row.id}-delete`}
                  ariaLabel="Delete action row"
                  tooltip="Delete action row"
                  onClick={() => handleRowDelete(row.id)}
                >
                  <Trash2 width={16} height={16} aria-hidden="true" />
                </IconButton>,
              ]}
              preElements={[
                <TextField
                  key={`${row.id}-identifier`}
                  value={row.identifier}
                  placeholder="ID"
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleRowChange(row.id, "identifier", e.target.value)
                  }
                  style={{
                    width: "60px",
                  }}
                />,
              ]}
              inputPlaceholder="Action name"
            />
          </div>
        ))}

        <div
          style={{
            display: "flex",
            gap: 4,
            alignItems: "center",
          }}
        >
          <TextField
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
            style={{
              width: "60px",
            }}
          />
          <TextField
            fullWidth
            placeholder="Action name"
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
          />
          <IconButton
            ariaLabel="Add action row"
            tooltip="Add action row"
            onClick={handleAddRow}
          >
            <Plus width={16} height={16} aria-hidden="true" />
          </IconButton>
        </div>
      </PopoverSection>
    </PopoverLayout>
  )
}
