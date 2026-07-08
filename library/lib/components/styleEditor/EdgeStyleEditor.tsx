import React from "react"
import { Typography } from "@/components/ui"
import { ColorField, StyleEditorPanel } from "./StyleEditorPanel"
import { CustomEdgeProps } from "@/edges"
import { useLabels } from "@/i18n/useLabels"

type updateEdgeDataColorsKeys = "strokeColor" | "textColor"

interface EdgeStyleEditorProps {
  edgeData?: CustomEdgeProps
  handleDataFieldUpdate: (key: updateEdgeDataColorsKeys, value: string) => void
  sideElements?: React.ReactNode[]
  label: string
}

export const EdgeStyleEditor: React.FC<EdgeStyleEditorProps> = ({
  edgeData,
  handleDataFieldUpdate,
  sideElements = [],
  label,
}) => {
  const t = useLabels()
  const colorFields: ColorField<updateEdgeDataColorsKeys>[] = [
    { key: "strokeColor", label: t.lineColor },
    { key: "textColor", label: t.textColor },
  ]
  return (
    <StyleEditorPanel
      fields={colorFields}
      getColor={(key) => edgeData?.[key]}
      onColorChange={handleDataFieldUpdate}
      sideElements={sideElements}
      headerVariant="edge"
    >
      <Typography variant="subtitle2" style={{ fontWeight: 600 }}>
        {label}
      </Typography>
    </StyleEditorPanel>
  )
}
