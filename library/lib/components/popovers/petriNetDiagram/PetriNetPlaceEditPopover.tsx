import { InfinityIcon } from "lucide-react"
import { IconButton, TextField, Typography } from "@/components/ui"
import { PetriNetPlaceProps } from "@/types"
import { useDiagramStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { PopoverProps } from "../types"
import { DefaultNodeEditPopover } from "../DefaultNodeEditPopover"
import { PopoverSection } from "../PopoverLayout"

export const PetriNetPlaceEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { nodes, setNodes } = useDiagramStore(
    useShallow((state) => ({
      nodes: state.nodes,
      setNodes: state.setNodes,
    }))
  )

  const handleTokensChange = (newTokens: number) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === elementId) {
          return {
            ...node,
            data: {
              ...node.data,
              tokens: newTokens,
            },
          }
        }
        return node
      })
    )
  }

  const handleCapacityChange = (
    newCapacity: number | "Infinity" | undefined
  ) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === elementId) {
          return {
            ...node,
            data: {
              ...node.data,
              capacity: newCapacity,
            },
          }
        }
        return node
      })
    )
  }
  const node = nodes.find((node) => node.id === elementId)
  if (!node) {
    return null
  }

  const nodeData = node.data as PetriNetPlaceProps

  return (
    <DefaultNodeEditPopover elementId={elementId}>
      <PopoverSection title="Marking" divider>
        <div
          style={{
            display: "flex",
            gap: 8,
            width: "100%",
            alignItems: "center",
          }}
        >
          <Typography sx={{ width: 72, flexShrink: 0 }}>Tokens</Typography>

          <TextField
            type="number"
            aria-label="Tokens"
            onChange={(event) => {
              const value = event.target.value
              // Empty/invalid commits 0 so the edit isn't lost before blur.
              const numValue = parseInt(value)
              handleTokensChange(value === "" || isNaN(numValue) ? 0 : numValue)
            }}
            value={nodeData.tokens ?? 0}
            fullWidth
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            width: "100%",
            alignItems: "center",
          }}
        >
          <Typography sx={{ width: 72, flexShrink: 0 }}>Capacity</Typography>

          <div style={{ position: "relative", flex: 1 }}>
            <TextField
              type="number"
              aria-label="Capacity"
              onChange={(event) => {
                const value = event.target.value
                if (value === "") {
                  handleCapacityChange(undefined)
                } else {
                  const numValue = parseInt(value)
                  handleCapacityChange(isNaN(numValue) ? undefined : numValue)
                }
              }}
              value={
                nodeData.capacity === "Infinity"
                  ? ""
                  : (nodeData.capacity ?? "")
              }
              fullWidth
            />
            {nodeData.capacity === "Infinity" && (
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  left: 8,
                  color: "var(--apollon-primary-contrast, #000000)",
                }}
              >
                <InfinityIcon width={16} height={16} aria-hidden="true" />
              </div>
            )}
          </div>
          <IconButton
            ariaLabel={
              nodeData.capacity === "Infinity"
                ? "Set a finite capacity"
                : "Set capacity to infinite"
            }
            tooltip={
              nodeData.capacity === "Infinity"
                ? "Set a finite capacity"
                : "Set capacity to infinite"
            }
            aria-pressed={nodeData.capacity === "Infinity"}
            onClick={() =>
              handleCapacityChange(
                nodeData.capacity === "Infinity" ? undefined : "Infinity"
              )
            }
          >
            <InfinityIcon width={16} height={16} aria-hidden="true" />
          </IconButton>
        </div>
      </PopoverSection>
    </DefaultNodeEditPopover>
  )
}
