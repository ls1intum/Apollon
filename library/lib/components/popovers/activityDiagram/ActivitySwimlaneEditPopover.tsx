import { ChangeEvent } from "react"
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  IconButton,
  Typography,
} from "@mui/material"
import { NodeStyleEditor, PrimaryButton, TextField } from "@/components/ui"
import {
  flipSwimlaneChildPosition,
  generateUUID,
  getLaneOffsets,
  laneIndexAtOffset,
  materializeLaneSizes,
} from "@/utils"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { ActivitySwimlaneProps, DefaultNodeProps, SwimlaneLane } from "@/types"
import { PopoverProps } from "../types"
import { DeleteIcon, DragHandleIcon } from "@/components/Icon"
import { type Node } from "@xyflow/react"
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

type LaneRowProps = {
  lane: SwimlaneLane
  canDelete: boolean
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

const SortableLaneRow: React.FC<LaneRowProps> = ({
  lane,
  canDelete,
  onRename,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lane.id })
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
      sx={{ display: "flex", gap: 0.5, alignItems: "center" }}
    >
      <Box
        {...attributes}
        {...listeners}
        aria-label="Reorder lane"
        sx={{
          cursor: "grab",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          "&:active": { cursor: "grabbing" },
        }}
      >
        <DragHandleIcon width={16} height={16} />
      </Box>
      <TextField
        size="small"
        // flex + minWidth:0 so the field shrinks to leave room for the controls;
        // `fullWidth` (100%) would push them out of the popover and clip them.
        sx={{ flex: 1, minWidth: 0 }}
        value={lane.name}
        placeholder="Lane name"
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onRename(lane.id, e.target.value)
        }
      />
      <IconButton
        size="small"
        aria-label="Delete lane"
        disabled={!canDelete}
        onClick={() => onDelete(lane.id)}
        sx={{ flexShrink: 0 }}
      >
        <DeleteIcon width={16} height={16} />
      </IconButton>
    </Box>
  )
}

export const ActivitySwimlaneEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { nodes, setNodes } = useDiagramStore(
    useShallow((state) => ({ nodes: state.nodes, setNodes: state.setNodes }))
  )
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const node = nodes.find((n) => n.id === elementId)
  if (!node) return null

  const data = node.data as ActivitySwimlaneProps
  const lanes = data.lanes ?? []
  const orientation = data.orientation ?? "vertical"
  const isVertical = orientation === "vertical"

  // Lanes are sized in absolute px along the primary axis (width for columns,
  // height for rows); add/remove grows/shrinks the node by the affected lane's
  // extent so the other lanes keep their on-screen size.
  const primaryExtent = isVertical ? (node.width ?? 0) : (node.height ?? 0)

  const patch = (update: (n: Node) => Node) =>
    setNodes((current) =>
      current.map((n) => (n.id === elementId ? update(n) : n))
    )

  const withPrimaryExtent = (n: Node, nextExtent: number): Node => {
    const key = isVertical ? "width" : "height"
    return {
      ...n,
      [key]: nextExtent,
      measured: { ...n.measured, [key]: nextExtent },
    }
  }

  const setLanes = (nextLanes: SwimlaneLane[], nextExtent?: number) =>
    patch((n) => {
      const updated: Node = { ...n, data: { ...n.data, lanes: nextLanes } }
      return nextExtent === undefined
        ? updated
        : withPrimaryExtent(updated, nextExtent)
    })

  const handleOrientationChange = (next: "vertical" | "horizontal") => {
    if (next === orientation) return
    // Flipping the primary axis swaps the node's width and height. Children are
    // positioned relative to the swimlane, so transpose + clamp them into the
    // swapped frame (see flipSwimlaneChildPosition) so a child near the old
    // primary edge isn't stranded off the new cross-axis. Read the swimlane's
    // current dimensions from `current` (not a render snapshot) so a resize
    // while the popover is open can't write stale bounds.
    setNodes((current) => {
      const swimlane = current.find((n) => n.id === elementId)
      const newWidth = swimlane?.height ?? 0
      const newHeight = swimlane?.width ?? 0
      return current.map((n) => {
        if (n.id === elementId) {
          return {
            ...n,
            data: { ...n.data, orientation: next },
            width: newWidth,
            height: newHeight,
            measured: { ...n.measured, width: newWidth, height: newHeight },
          }
        }
        if (n.parentId === elementId) {
          return {
            ...n,
            position: flipSwimlaneChildPosition(n, newWidth, newHeight),
          }
        }
        return n
      })
    })
  }

  const handleLaneNameChange = (id: string, name: string) =>
    setLanes(lanes.map((lane) => (lane.id === id ? { ...lane, name } : lane)))

  const handleLaneDelete = (id: string) => {
    if (lanes.length <= 1) return
    const sized = materializeLaneSizes(lanes, primaryExtent)
    const removed = sized.find((lane) => lane.id === id)?.size ?? 0
    // Shrink the node by the removed lane's extent; the rest keep their sizes.
    setLanes(
      sized.filter((lane) => lane.id !== id),
      primaryExtent - removed
    )
  }

  const handleAddLane = () => {
    // Name the new lane one past the highest existing "Lane N" so deleting a
    // middle lane and re-adding doesn't reuse a name that's still in use.
    const numbers = lanes
      .map((lane) => /^Lane (\d+)$/.exec(lane.name)?.[1])
      .filter((n): n is string => n != null)
      .map(Number)
    const nextNumber = numbers.length
      ? Math.max(...numbers) + 1
      : lanes.length + 1
    // Grow the node by one average lane; existing lanes keep their extent and
    // the new (now last, elastic) lane fills the added space.
    const average = primaryExtent / lanes.length
    setLanes(
      [
        ...materializeLaneSizes(lanes, primaryExtent),
        { id: generateUUID(), name: `Lane ${nextNumber}`, size: average },
      ],
      primaryExtent + average
    )
  }

  const handleReorder = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const oldIndex = lanes.findIndex((lane) => lane.id === active.id)
    const newIndex = lanes.findIndex((lane) => lane.id === over.id)
    // Pin sizes first so the elastic last lane keeps its extent through the move.
    const sized = materializeLaneSizes(lanes, primaryExtent)
    const reordered = arrayMove(sized, oldIndex, newIndex)
    const oldOffsets = getLaneOffsets(sized, primaryExtent)
    const newOffsets = getLaneOffsets(reordered, primaryExtent)
    // Move each child so it stays in its lane: shift its primary-axis position
    // by how far that lane moved.
    setNodes((current) =>
      current.map((n) => {
        if (n.id === elementId) {
          return { ...n, data: { ...n.data, lanes: reordered } }
        }
        if (n.parentId === elementId) {
          const center = isVertical
            ? n.position.x + (n.width ?? 0) / 2
            : n.position.y + (n.height ?? 0) / 2
          const fromLane = laneIndexAtOffset(oldOffsets, center)
          const toLane = reordered.findIndex(
            (lane) => lane.id === sized[fromLane].id
          )
          const shift = newOffsets[toLane].start - oldOffsets[fromLane].start
          return {
            ...n,
            position: isVertical
              ? { x: n.position.x + shift, y: n.position.y }
              : { x: n.position.x, y: n.position.y + shift },
          }
        }
        return n
      })
    )
  }

  const handleDataFieldUpdate = (key: keyof DefaultNodeProps, value: string) =>
    patch((n) => ({ ...n, data: { ...n.data, [key]: value } }))

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <NodeStyleEditor
        title="Swimlane"
        nodeData={data}
        handleDataFieldUpdate={handleDataFieldUpdate}
        showNameInputChange={false}
      />

      <FormControl fullWidth size="small">
        <InputLabel id="swimlane-orientation-label">Orientation</InputLabel>
        <Select
          labelId="swimlane-orientation-label"
          id="swimlane-orientation-select"
          value={orientation}
          label="Orientation"
          onChange={(e) =>
            handleOrientationChange(e.target.value as "vertical" | "horizontal")
          }
        >
          <MenuItem value="vertical">Vertical (columns)</MenuItem>
          <MenuItem value="horizontal">Horizontal (rows)</MenuItem>
        </Select>
      </FormControl>

      <Typography variant="caption" sx={{ opacity: 0.7, mt: 0.5 }}>
        Lanes
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          maxHeight: 180,
          overflowY: "auto",
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleReorder}
        >
          <SortableContext
            items={lanes.map((lane) => lane.id)}
            strategy={verticalListSortingStrategy}
          >
            {lanes.map((lane) => (
              <SortableLaneRow
                key={lane.id}
                lane={lane}
                canDelete={lanes.length > 1}
                onRename={handleLaneNameChange}
                onDelete={handleLaneDelete}
              />
            ))}
          </SortableContext>
        </DndContext>
      </Box>

      <PrimaryButton isSelected={false} onClick={handleAddLane}>
        + Add lane
      </PrimaryButton>
    </Box>
  )
}
