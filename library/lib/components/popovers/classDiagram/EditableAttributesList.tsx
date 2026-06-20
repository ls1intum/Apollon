import React, { useState, KeyboardEvent, ChangeEvent } from "react"
import { Box } from "@mui/material"
import { NodeStyleEditor, TextField, Typography } from "@/components/ui"
import { generateUUID } from "@/utils"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { ClassNodeProps } from "@/types"
import { DeleteIcon, DragHandleIcon } from "@/components/Icon"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface Props {
  nodeId: string
}

interface SortableAttributeRowProps {
  id: string
  nodeId: string
  item: { id: string; name: string }
  onAttributeChange: (id: string, key: string, value: string) => void
  onDelete: (id: string) => void
}

const SortableAttributeRow: React.FC<SortableAttributeRowProps> = ({
  id,
  item,
  onAttributeChange,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : undefined,
  }

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        display: "flex",
        gap: 0.5,
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {/* Drag handle */}
      <Box
        {...attributes}
        {...listeners}
        sx={{
          cursor: "grab",
          display: "flex",
          alignItems: "center",
          color: "text.secondary",
          "&:active": { cursor: "grabbing" },
          flexShrink: 0,
        }}
      >
        <DragHandleIcon width={16} height={16} />
      </Box>

      <NodeStyleEditor
        noStrokeUpdate
        nodeData={item}
        handleDataFieldUpdate={(key, value) =>
          onAttributeChange(item.id, key, value)
        }
        sideElements={[
          <DeleteIcon
            key={`delete_${item.id}`}
            width={16}
            height={16}
            style={{ cursor: "pointer" }}
            onClick={() => onDelete(item.id)}
          />,
        ]}
      />
    </Box>
  )
}

export const EditableAttributeList: React.FC<Props> = ({ nodeId }) => {
  const { nodes, setNodes } = useDiagramStore(
    useShallow((state) => ({ setNodes: state.setNodes, nodes: state.nodes }))
  )
  const [newItem, setNewItem] = useState("")

  const nodeData = nodes.find((node) => node.id === nodeId)?.data as
    | ClassNodeProps
    | undefined
  const attributes = nodeData?.attributes ?? []

  const patchAttributes = (updatedAttributes: typeof attributes) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, attributes: updatedAttributes } }
          : node
      )
    )
  }

  const handleAttributeChange = (id: string, key: string, newName: string) => {
    patchAttributes(
      attributes.map((item) =>
        item.id === id ? { ...item, [key]: newName } : item
      )
    )
  }

  const handleItemDelete = (id: string) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== nodeId) return node
        return {
          ...node,
          data: {
            ...node.data,
            attributes: attributes.filter((item) => item.id !== id),
          },
          height: node.height! - 30,
          measured: { ...node.measured, height: node.height! - 30 },
        }
      })
    )
  }

  const handleAddItem = () => {
    if (newItem.trim() === "") return
    const newAttribute = { id: generateUUID(), name: newItem }
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== nodeId) return node
        return {
          ...node,
          data: {
            ...node.data,
            attributes: [...attributes, newAttribute],
          },
          height: node.height! + 30,
          measured: { ...node.measured, height: node.height! + 30 },
        }
      })
    )
    setNewItem("")
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") handleAddItem()
  }

  // drag and drop setup
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = attributes.findIndex((a) => a.id === active.id)
    const newIndex = attributes.findIndex((a) => a.id === over.id)
    patchAttributes(arrayMove(attributes, oldIndex, newIndex))
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <Typography variant="h6">Attributes</Typography>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={attributes.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {attributes.map((item) => (
            <SortableAttributeRow
              key={item.id}
              id={item.id}
              nodeId={nodeId}
              item={item}
              onAttributeChange={handleAttributeChange}
              onDelete={handleItemDelete}
            />
          ))}
        </SortableContext>
      </DndContext>

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
          if (newItem.trim() !== "") handleAddItem()
          else setNewItem("")
        }}
        onKeyDown={handleKeyDown}
      />
    </Box>
  )
}
