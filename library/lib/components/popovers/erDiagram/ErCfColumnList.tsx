import { KeyboardEvent, useState } from "react"
import { Box, Select, MenuItem, Checkbox } from "@mui/material"
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
import { TextField, Typography, DividerLine } from "@/components/ui"
import {
  ColorButton,
  ColorButtons,
} from "@/components/ui/StyleEditor/ColorButtons"
import { DeleteIcon, DragHandleIcon, CrossIcon } from "@/components/Icon"
import { PaintRollerIcon } from "@/components/Icon/PaintRollerIcon"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { generateUUID } from "@/utils"
import { ErCfColumn, ErCfColumnKey, ErCfEntityProps } from "@/types"
import { LAYOUT } from "@/constants"

const KEY_OPTIONS: ErCfColumnKey[] = ["PK", "FK", "UK"]
// Per-column colour fields — fill + text, exactly the noStrokeUpdate set the
// class diagram exposes per attribute.
const COLOR_FIELDS: { key: "fillColor" | "textColor"; label: string }[] = [
  { key: "fillColor", label: "Fill Color" },
  { key: "textColor", label: "Text Color" },
]
// Shared column template so the header labels line up over the inputs.
const ICON_SLOT = 16
const KEY_WIDTH = 70
const ROW_GAP = 0.75
const NAME_FLEX = 1.5
const TYPE_FLEX = 1.2

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
  const [paintOpen, setPaintOpen] = useState(false)
  const [activeField, setActiveField] = useState<
    "fillColor" | "textColor" | null
  >(null)

  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      sx={{ display: "flex", flexDirection: "column" }}
    >
      <Box sx={{ display: "flex", gap: ROW_GAP, alignItems: "center" }}>
        <Box
          {...attributes}
          {...listeners}
          sx={{
            cursor: "grab",
            display: "flex",
            alignItems: "center",
            color: "text.secondary",
            flexShrink: 0,
            "&:active": { cursor: "grabbing" },
          }}
        >
          <DragHandleIcon width={ICON_SLOT} height={ICON_SLOT} />
        </Box>

        <TextField
          size="small"
          placeholder="name"
          value={column.name}
          onChange={(e) => onChange(column.id, { name: e.target.value })}
          sx={{ flex: NAME_FLEX, minWidth: 0 }}
        />
        <TextField
          size="small"
          placeholder="type"
          value={column.type ?? ""}
          onChange={(e) => onChange(column.id, { type: e.target.value })}
          sx={{ flex: TYPE_FLEX, minWidth: 0 }}
        />
        <Select
          size="small"
          multiple
          displayEmpty
          value={column.keys ?? []}
          onChange={(e) =>
            onChange(column.id, { keys: e.target.value as ErCfColumnKey[] })
          }
          renderValue={(selected) =>
            selected.length ? selected.join(", ") : "—"
          }
          sx={{ width: KEY_WIDTH, flexShrink: 0 }}
        >
          {KEY_OPTIONS.map((k) => (
            <MenuItem key={k} value={k} dense>
              <Checkbox
                size="small"
                checked={(column.keys ?? []).includes(k)}
                sx={{ p: 0.5 }}
              />
              {k}
            </MenuItem>
          ))}
        </Select>

        <Box sx={{ flexShrink: 0, display: "flex" }}>
          <PaintRollerIcon
            onClick={() => {
              setPaintOpen((o) => !o)
              setActiveField(null)
            }}
            aria-label="Toggle column colors"
          />
        </Box>
        <DeleteIcon
          width={ICON_SLOT}
          height={ICON_SLOT}
          style={{ cursor: "pointer", flexShrink: 0 }}
          onClick={() => onDelete(column.id)}
        />
      </Box>

      {paintOpen && (
        <Box
          sx={{
            mt: 0.5,
            mb: 0.5,
            border: "1px solid var(--apollon-gray, #e9ecef)",
            borderRadius: 1,
          }}
        >
          {!activeField ? (
            COLOR_FIELDS.map(({ key, label }, i) => (
              <Box key={key}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1,
                  }}
                >
                  <Typography>{label}</Typography>
                  <ColorButton
                    color={column[key] || "#000000"}
                    onSelect={() => setActiveField(key)}
                  />
                </Box>
                {i < COLOR_FIELDS.length - 1 && (
                  <DividerLine backgroundColor="var(--apollon-gray, #e9ecef)" />
                )}
              </Box>
            ))
          ) : (
            <Box sx={{ p: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography>
                  {COLOR_FIELDS.find((f) => f.key === activeField)?.label}
                </Typography>
                <CrossIcon
                  fill="var(--apollon-primary-contrast, #000000)"
                  onClick={() => setActiveField(null)}
                />
              </Box>
              <ColorButtons
                onSelect={(color) =>
                  onChange(column.id, { [activeField]: color })
                }
              />
              <Typography
                variant="caption"
                sx={{ cursor: "pointer", display: "inline-block", mt: 1 }}
                onClick={() => onChange(column.id, { [activeField]: "" })}
              >
                Reset
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

// Editor for a crow's-foot entity's columns: name + data type + key role(s),
// with drag-to-reorder. The key role is a compact multi-select so the row stays
// legible within the popover's narrow width.
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

      {columns.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          No columns yet — add the first one below.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", gap: ROW_GAP, alignItems: "center" }}>
          <Box sx={{ width: ICON_SLOT, flexShrink: 0 }} />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ flex: NAME_FLEX, lineHeight: 1 }}
          >
            Name
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ flex: TYPE_FLEX, lineHeight: 1 }}
          >
            Type
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ width: KEY_WIDTH, flexShrink: 0, lineHeight: 1 }}
          >
            Key
          </Typography>
          <Box sx={{ width: ICON_SLOT, flexShrink: 0 }} />
        </Box>
      )}

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

      <TextField
        size="small"
        fullWidth
        placeholder="+ Add column"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onBlur={onAdd}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) =>
          e.key === "Enter" && onAdd()
        }
        sx={{ mt: 0.5 }}
      />
    </Box>
  )
}
