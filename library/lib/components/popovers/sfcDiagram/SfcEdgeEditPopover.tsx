import { useReactiveEdge } from "@/hooks"
import { TextField } from "@/components/ui"
import { EdgeStyleEditor } from "@/components/styleEditor"
import { PopoverProps } from "../types"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"
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
    <PopoverLayout title="Edge">
      <EdgeStyleEditor
        label="Style"
        edgeData={edgeDataCustom}
        handleDataFieldUpdate={(key, value) =>
          updateEdgeData(elementId, { [key]: value })
        }
      />

      <PopoverSection title="Condition" divider>
        <TextField
          value={edgeData.displayName}
          onChange={(e) => handleDisplayNameChange(e.target.value)}
          placeholder="Condition"
          size="small"
          fullWidth
        />

        {edgeData.displayName && (
          <>
            <label className="apollon-checkbox-label">
              <input
                type="checkbox"
                className="apollon-checkbox"
                checked={edgeData.showBar}
                onChange={(e) => handleShowBarChange(e.target.checked)}
              />
              Show crossbar
            </label>

            <label className="apollon-checkbox-label">
              <input
                type="checkbox"
                className="apollon-checkbox"
                checked={edgeData.isNegated}
                onChange={(e) => handleIsNegatedChange(e.target.checked)}
              />
              Negated condition (overline)
            </label>
          </>
        )}
      </PopoverSection>
    </PopoverLayout>
  )
}
