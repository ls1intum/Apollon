import { Box, FormControlLabel, Checkbox } from "@mui/material"
import { useReactiveEdge } from "@/hooks"
import { EdgeStyleEditor, TextField } from "@/components/ui"
import { PopoverProps } from "../types"
import { useReactFlow } from "@xyflow/react"
import { useState, useCallback, useEffect } from "react"
import { CustomEdgeProps } from "@/edges"

interface SfcEdgeData {
  isNegated: boolean
  displayName: string
  showBar: boolean
}

function parseSfcEdgeLabel(label: string | undefined): SfcEdgeData {
  if (!label) {
    return { isNegated: false, displayName: "", showBar: true }
  }

  try {
    const parsed = JSON.parse(label)
    return {
      isNegated: parsed.isNegated || false,
      displayName: parsed.displayName || "",
      showBar: parsed.showBar !== false, // default to true
    }
  } catch {
    return { isNegated: false, displayName: label, showBar: true }
  }
}

function serializeSfcEdgeLabel(data: SfcEdgeData): string {
  return JSON.stringify(data)
}

export const SfcEdgeEditPopover: React.FC<PopoverProps> = ({ elementId }) => {
  const { updateEdgeData } = useReactFlow()
  const edge = useReactiveEdge(elementId)

  const [edgeData, setEdgeData] = useState<SfcEdgeData>(() =>
    parseSfcEdgeLabel(edge?.data?.label as string | undefined)
  )

  useEffect(() => {
    if (edge) {
      setEdgeData(parseSfcEdgeLabel(edge.data?.label as string | undefined))
    }
  }, [edge])

  const handleDisplayNameChange = useCallback(
    (value: string) => {
      const newData = { ...edgeData, displayName: value }
      setEdgeData(newData)
      updateEdgeData(elementId, {
        label: value ? serializeSfcEdgeLabel(newData) : undefined,
      })
    },
    [edgeData, updateEdgeData, elementId]
  )

  const handleShowBarChange = useCallback(
    (checked: boolean) => {
      const newData = { ...edgeData, showBar: checked }
      setEdgeData(newData)
      if (edgeData.displayName) {
        updateEdgeData(elementId, {
          label: serializeSfcEdgeLabel(newData),
        })
      }
    },
    [edgeData, updateEdgeData, elementId]
  )

  const handleIsNegatedChange = useCallback(
    (checked: boolean) => {
      const newData = { ...edgeData, isNegated: checked }
      setEdgeData(newData)
      if (edgeData.displayName) {
        updateEdgeData(elementId, {
          label: serializeSfcEdgeLabel(newData),
        })
      }
    },
    [edgeData, updateEdgeData, elementId]
  )

  if (!edge) return null

  const edgeDataCustom = edge.data as CustomEdgeProps

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <EdgeStyleEditor
        label="Edit Transition"
        edgeData={edgeDataCustom}
        handleDataFieldUpdate={(key, value) =>
          updateEdgeData(elementId, { [key]: value })
        }
      />

      <TextField
        label="Condition"
        value={edgeData.displayName}
        onChange={(e) => handleDisplayNameChange(e.target.value)}
        placeholder="Enter transition condition"
        size="small"
        fullWidth
      />

      {edgeData.displayName && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={edgeData.showBar}
                onChange={(e) => handleShowBarChange(e.target.checked)}
                size="small"
              />
            }
            label="Show crossbar"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={edgeData.isNegated}
                onChange={(e) => handleIsNegatedChange(e.target.checked)}
                size="small"
              />
            }
            label="Negated condition (overline)"
          />
        </Box>
      )}
    </Box>
  )
}
