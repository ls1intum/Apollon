import React, { useState, KeyboardEvent, ChangeEvent } from "react"
import { GripVertical, Plus, Trash2 } from "lucide-react"
import { IconButton, TextField, Typography } from "@/components/ui"
import { NodeStyleEditor } from "@/components/styleEditor"
import { generateUUID } from "@/utils"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { ClassNodeProps } from "@/types"
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
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: "flex",
        gap: 4,
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div
        {...attributes}
        {...listeners}
        // dnd-kit's `attributes` set `role="button"` + `aria-roledescription`
        // but no name; the grip icon is aria-hidden, so name the handle
        // explicitly (axe: aria-command-name).
        aria-label="Reorder attribute"
        className="apollon-drag-handle"
        style={{
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <GripVertical width={16} height={16} aria-hidden="true" />
      </div>

      <NodeStyleEditor
        noStrokeUpdate
        nodeData={item}
        colorEditorLabel="attribute"
        handleDataFieldUpdate={(key, value) =>
          onAttributeChange(item.id, key, value)
        }
        sideElements={[
          <IconButton
            key={`delete_${item.id}`}
            ariaLabel="Delete attribute"
            tooltip="Delete attribute"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 width={16} height={16} aria-hidden="true" />
          </IconButton>,
        ]}
      />
    </div>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        Attributes
      </Typography>

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

      <div className="apollon-add-row">
        <TextField
          fullWidth
          aria-label="New attribute"
          placeholder="Add attribute"
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
        <IconButton
          ariaLabel="Add attribute"
          tooltip="Add attribute"
          onClick={handleAddItem}
        >
          <Plus width={16} height={16} aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  )
}
