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
import { flipSwimlaneChildPosition, generateUUID } from "@/utils"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { ActivitySwimlaneProps, DefaultNodeProps, SwimlaneLane } from "@/types"
import { PopoverProps } from "../types"
import { DeleteIcon } from "@/components/Icon"
import { type Node } from "@xyflow/react"

export const ActivitySwimlaneEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { nodes, setNodes } = useDiagramStore(
    useShallow((state) => ({ nodes: state.nodes, setNodes: state.setNodes }))
  )

  const node = nodes.find((n) => n.id === elementId)
  if (!node) return null

  const data = node.data as ActivitySwimlaneProps
  const lanes = data.lanes ?? []
  const orientation = data.orientation ?? "vertical"
  const isVertical = orientation === "vertical"

  // Lanes divide the primary axis (width for columns, height for rows)
  // equally, so add/remove grows or shrinks the node by one lane's extent.
  const primaryExtent = isVertical ? (node.width ?? 0) : (node.height ?? 0)
  const laneExtent = primaryExtent / Math.max(lanes.length, 1)

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
    setLanes(
      lanes.filter((lane) => lane.id !== id),
      primaryExtent - laneExtent
    )
  }

  const handleAddLane = () => {
    // Name the new lane one past the highest existing "Lane N" so deleting a
    // middle lane and re-adding doesn't reuse a name that's still in use.
    const numbers = lanes
      .map((lane) => /^Lane (\d+)$/.exec(lane.name)?.[1])
      .filter((n): n is string => n != null)
      .map(Number)
    const next = numbers.length ? Math.max(...numbers) + 1 : lanes.length + 1
    const newLane: SwimlaneLane = { id: generateUUID(), name: `Lane ${next}` }
    setLanes([...lanes, newLane], primaryExtent + laneExtent)
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
        {lanes.map((lane) => (
          <Box
            key={lane.id}
            sx={{ display: "flex", gap: 0.5, alignItems: "center" }}
          >
            <TextField
              size="small"
              // flex + minWidth:0 so the field shrinks to leave room for the
              // delete button; `fullWidth` (100%) would push the icon out of
              // the popover and clip it.
              sx={{ flex: 1, minWidth: 0 }}
              value={lane.name}
              placeholder="Lane name"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleLaneNameChange(lane.id, e.target.value)
              }
            />
            <IconButton
              size="small"
              aria-label="Delete lane"
              disabled={lanes.length <= 1}
              onClick={() => handleLaneDelete(lane.id)}
              sx={{ flexShrink: 0 }}
            >
              <DeleteIcon width={16} height={16} />
            </IconButton>
          </Box>
        ))}
      </Box>

      <PrimaryButton isSelected={false} onClick={handleAddLane}>
        + Add lane
      </PrimaryButton>
    </Box>
  )
}
