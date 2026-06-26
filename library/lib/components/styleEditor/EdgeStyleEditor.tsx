import React from "react"
import { Typography } from "@/components/ui"
import { ColorField, StyleEditorPanel } from "./StyleEditorPanel"
import { CustomEdgeProps } from "@/edges"

type updateEdgeDataColorsKeys = "strokeColor" | "textColor"

interface EdgeStyleEditorProps {
  edgeData?: CustomEdgeProps
  handleDataFieldUpdate: (key: updateEdgeDataColorsKeys, value: string) => void
  sideElements?: React.ReactNode[]
  label: string
}

const colorFields: ColorField<updateEdgeDataColorsKeys>[] = [
  { key: "strokeColor", label: "Line Color" },
  { key: "textColor", label: "Text Color" },
]

export const EdgeStyleEditor: React.FC<EdgeStyleEditorProps> = ({
  edgeData,
  handleDataFieldUpdate,
  sideElements = [],
  label,
}) => {
  return (
    <StyleEditorPanel
      fields={colorFields}
      getColor={(key) => edgeData?.[key]}
      onColorChange={handleDataFieldUpdate}
      sideElements={sideElements}
      headerVariant="edge"
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
    </StyleEditorPanel>
  )
}
