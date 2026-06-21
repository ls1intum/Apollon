import { KeyboardEvent, useState } from "react"
import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material"
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
import { TextField, Typography, PrimaryButton } from "@/components/ui"
import { DeleteIcon, DragHandleIcon } from "@/components/Icon"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { generateUUID } from "@/utils"
import { ErCfColumn, ErCfColumnKey, ErCfEntityProps } from "@/types"
import { LAYOUT } from "@/constants"

const KEY_OPTIONS: ErCfColumnKey[] = ["PK", "FK", "UK"]

interface RowProps {
  column: ErCfColumn
  onChange: (id: string, patch: Partial<ErCfColumn>) => void
  onDelete: (id: string) => void
}

const SortableColumnRow: React.FC<RowProps> = ({
  column,
  onChange,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id })

  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      sx={{ display: "flex", gap: 0.5, alignItems: "center" }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{ cursor: "grab", display: "flex", color: "text.secondary" }}
      >
        <DragHandleIcon width={16} height={16} />
      </Box>
      <TextField
        size="small"
        placeholder="name"
        value={column.name}
        onChange={(e) => onChange(column.id, { name: e.target.value })}
        sx={{ flex: 2 }}
      />
      <TextField
        size="small"
        placeholder="type"
        value={column.type ?? ""}
        onChange={(e) => onChange(column.id, { type: e.target.value })}
        sx={{ flex: 1 }}
      />
      <ToggleButtonGroup
        size="small"
        value={column.keys ?? []}
        onChange={(_, keys: ErCfColumnKey[]) => onChange(column.id, { keys })}
      >
        {KEY_OPTIONS.map((k) => (
          <ToggleButton key={k} value={k} sx={{ px: 0.75 }}>
            {k}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <DeleteIcon
        width={16}
        height={16}
        style={{ cursor: "pointer", flexShrink: 0 }}
        onClick={() => onDelete(column.id)}
      />
    </Box>
  )
}

// Editor for a crow's-foot entity's columns: name + data type + key role(s),
// with drag-to-reorder. Replaces the class diagram's single-name editor.
export const ErCfColumnList: React.FC<{ nodeId: string }> = ({ nodeId }) => {
  const { nodes, setNodes } = useDiagramStore(
    useShallow((state) => ({ setNodes: state.setNodes, nodes: state.nodes }))
  )
  const [newName, setNewName] = useState("")

  const data = nodes.find((n) => n.id === nodeId)?.data as
    | ErCfEntityProps
    | undefined
  const columns = data?.attributes ?? []

  const patch = (next: ErCfColumn[], heightDelta = 0) =>
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: { ...node.data, attributes: next },
              ...(heightDelta
                ? {
                    height: (node.height ?? 0) + heightDelta,
                    measured: {
                      ...node.measured,
                      height: (node.height ?? 0) + heightDelta,
                    },
                  }
                : {}),
            }
          : node
      )
    )

  const onChange = (id: string, fields: Partial<ErCfColumn>) =>
    patch(columns.map((c) => (c.id === id ? { ...c, ...fields } : c)))

  const onDelete = (id: string) =>
    patch(
      columns.filter((c) => c.id !== id),
      -LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT
    )

  const onAdd = () => {
    if (newName.trim() === "") return
    patch(
      [...columns, { id: generateUUID(), name: newName.trim(), keys: [] }],
      LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT
    )
    setNewName("")
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    patch(
      arrayMove(
        columns,
        columns.findIndex((c) => c.id === active.id),
        columns.findIndex((c) => c.id === over.id)
      )
    )
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <Typography variant="h6">Columns</Typography>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={columns.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {columns.map((column) => (
            <SortableColumnRow
              key={column.id}
              column={column}
              onChange={onChange}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
      </DndContext>
      <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
        <TextField
          size="small"
          placeholder="new column"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) =>
            e.key === "Enter" && onAdd()
          }
          fullWidth
        />
        <PrimaryButton isSelected={false} onClick={onAdd}>
          Add
        </PrimaryButton>
      </Box>
    </Box>
  )
}
