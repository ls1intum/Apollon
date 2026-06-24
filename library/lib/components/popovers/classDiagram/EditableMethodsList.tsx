import React, { useState, KeyboardEvent, ChangeEvent } from "react"
import { GripVertical, Plus, Trash2 } from "lucide-react"
import {
  IconButton,
  NodeStyleEditor,
  TextField,
  Typography,
} from "@/components/ui"
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

interface SortableMethodRowProps {
  id: string
  item: { id: string; name: string }
  onMethodChange: (id: string, key: string, value: string) => void
  onDelete: (id: string) => void
}

const SortableMethodRow: React.FC<SortableMethodRowProps> = ({
  id,
  item,
  onMethodChange,
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
        colorEditorLabel="method"
        handleDataFieldUpdate={(key, value) =>
          onMethodChange(item.id, key, value)
        }
        sideElements={[
          <IconButton
            key={`delete_${item.id}`}
            ariaLabel="Delete method"
            tooltip="Delete method"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 width={16} height={16} aria-hidden="true" />
          </IconButton>,
        ]}
      />
    </div>
  )
}

export const EditableMethodsList: React.FC<Props> = ({ nodeId }) => {
  const { nodes, setNodes } = useDiagramStore(
    useShallow((state) => ({ setNodes: state.setNodes, nodes: state.nodes }))
  )
  const [newItem, setNewItem] = useState("")

  const nodeData = nodes.find((node) => node.id === nodeId)?.data as
    | ClassNodeProps
    | undefined
  const methods = nodeData?.methods ?? []

  const patchMethods = (updatedMethods: typeof methods) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, methods: updatedMethods } }
          : node
      )
    )
  }

  const handleMethodChange = (id: string, key: string, newName: string) => {
    patchMethods(
      methods.map((item) =>
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
            methods: methods.filter((item) => item.id !== id),
          },
          height: node.height! - 30,
          measured: { ...node.measured, height: node.height! - 30 },
        }
      })
    )
  }

  const handleAddItem = () => {
    if (newItem.trim() === "") return
    const newMethod = { id: generateUUID(), name: newItem }
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== nodeId) return node
        return {
          ...node,
          data: { ...node.data, methods: [...methods, newMethod] },
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

    const oldIndex = methods.findIndex((m) => m.id === active.id)
    const newIndex = methods.findIndex((m) => m.id === over.id)
    patchMethods(arrayMove(methods, oldIndex, newIndex))
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        Methods
      </Typography>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={methods.map((m) => m.id)}
          strategy={verticalListSortingStrategy}
        >
          {methods.map((item) => (
            <SortableMethodRow
              key={item.id}
              id={item.id}
              item={item}
              onMethodChange={handleMethodChange}
              onDelete={handleItemDelete}
            />
          ))}
        </SortableContext>
      </DndContext>

      <div className="apollon-add-row">
        <TextField
          size="small"
          fullWidth
          variant="outlined"
          aria-label="New method"
          placeholder="Add method"
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
          ariaLabel="Add method"
          tooltip="Add method"
          onClick={handleAddItem}
        >
          <Plus width={16} height={16} aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  )
}
