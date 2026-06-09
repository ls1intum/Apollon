import { Box, FormControl, InputLabel, Select, MenuItem } from "@mui/material"
import { EdgeStyleEditor, TextField, Typography } from "@/components/ui"
import { useReactFlow } from "@xyflow/react"
import { CustomEdgeProps } from "@/edges/EdgeProps"
import { SwapHorizIcon } from "@/components/Icon"
import { useEdgePopOver } from "@/hooks"
import { PopoverProps } from "../types"

const EDGE_TYPE_ICON_FILL = "var(--apollon-background-variant, transparent)"

type ClassEdgeTypeIconMarker =
  | { type: "none" }
  | { type: "arrow" }
  | { type: "triangle" }
  | { type: "rhombus"; filled: boolean }

type ClassEdgeTypeIconConfig = {
  dashed: boolean
  lineEndX: number
  marker: ClassEdgeTypeIconMarker
}

const CLASS_EDGE_TYPE_OPTIONS = [
  {
    value: "ClassBidirectional",
    label: "Bi-Association",
    icon: { dashed: false, lineEndX: 52, marker: { type: "none" } },
  },
  {
    value: "ClassUnidirectional",
    label: "Uni-Association",
    icon: { dashed: false, lineEndX: 40, marker: { type: "arrow" } },
  },
  {
    value: "ClassAggregation",
    label: "Aggregation",
    icon: {
      dashed: false,
      lineEndX: 38,
      marker: { type: "rhombus", filled: false },
    },
  },
  {
    value: "ClassComposition",
    label: "Composition",
    icon: {
      dashed: false,
      lineEndX: 38,
      marker: { type: "rhombus", filled: true },
    },
  },
  {
    value: "ClassInheritance",
    label: "Inheritance",
    icon: { dashed: false, lineEndX: 40, marker: { type: "triangle" } },
  },
  {
    value: "ClassDependency",
    label: "Dependency",
    icon: { dashed: true, lineEndX: 40, marker: { type: "arrow" } },
  },
  {
    value: "ClassRealization",
    label: "Realization",
    icon: { dashed: true, lineEndX: 40, marker: { type: "triangle" } },
  },
] as const satisfies ReadonlyArray<{
  value: string
  label: string
  icon: ClassEdgeTypeIconConfig
}>

const ClassEdgeTypeIcon = ({ icon }: { icon: ClassEdgeTypeIconConfig }) => {
  return (
    <Box
      component="svg"
      aria-hidden
      focusable="false"
      viewBox="0 0 56 20"
      sx={{
        width: 56,
        height: 20,
        color: "inherit",
        flex: "0 0 auto",
      }}
    >
      <line
        x1="4"
        y1="10"
        x2={icon.lineEndX}
        y2="10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray={icon.dashed ? "5 4" : undefined}
      />

      {icon.marker.type === "arrow" && (
        <path
          d="M42 5 L52 10 L42 15"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {icon.marker.type === "triangle" && (
        <path
          d="M52 10 L40 4 L40 16 Z"
          fill={EDGE_TYPE_ICON_FILL}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      )}
      {icon.marker.type === "rhombus" && (
        <path
          d="M52 10 L45 5 L38 10 L45 15 Z"
          fill={icon.marker.filled ? "currentColor" : EDGE_TYPE_ICON_FILL}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      )}
    </Box>
  )
}

export const EdgeEditPopover: React.FC<PopoverProps> = ({ elementId }) => {
  const { getEdge, getNode, updateEdgeData } = useReactFlow()

  const edge = getEdge(elementId)
  const {
    handleSourceRoleChange,
    handleSourceMultiplicityChange,
    handleTargetRoleChange,
    handleTargetMultiplicityChange,
    handleEdgeTypeChange,
    handleSwap,
  } = useEdgePopOver(elementId)

  if (!edge) {
    return null
  }

  const edgeData = edge.data as CustomEdgeProps | undefined
  const sourceNode = getNode(edge.source)
  const targetNode = getNode(edge.target)
  const sourceName = (sourceNode?.data?.name as string) ?? "Source"
  const targetName = (targetNode?.data?.name as string) ?? "Target"

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <EdgeStyleEditor
        edgeData={edgeData}
        handleDataFieldUpdate={(key, value) =>
          updateEdgeData(elementId, { ...edge.data, [key]: value })
        }
        label="Edge Type"
        sideElements={[
          handleSwap && (
            <Box
              key="swap-edge-direction"
              sx={{ display: "flex", justifyContent: "flex-end" }}
            >
              <SwapHorizIcon
                style={{ cursor: "pointer" }}
                onClick={handleSwap}
              />
            </Box>
          ),
        ]}
      />

      <FormControl fullWidth size="small">
        <InputLabel id="edge-type-label">Edge Type</InputLabel>
        <Select
          labelId="edge-type-label"
          id="edge-type-select"
          value={edge.type}
          label="Edge Type"
          onChange={(e) => handleEdgeTypeChange(e.target.value)}
          MenuProps={{
            disablePortal: true,
            PaperProps: {
              sx: {
                backgroundColor: "var(--apollon-background-variant, #f8f9fa)",
                color: "var(--apollon-primary-contrast, #000000)",
              },
            },
          }}
        >
          {CLASS_EDGE_TYPE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Box
                sx={{
                  alignItems: "center",
                  display: "flex",
                  gap: 2,
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <Box component="span">{option.label}</Box>
                <ClassEdgeTypeIcon icon={option.icon} />
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {
        <>
          {/* Source subheadline */}
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            {sourceName}
          </Typography>

          {/* Source Multiplicity */}
          <TextField
            label={sourceName + " Multiplicity"}
            value={edgeData?.sourceMultiplicity ?? ""}
            onChange={(e) => handleSourceMultiplicityChange(e.target.value)}
            size="small"
            fullWidth
          />

          {/* Source Role */}
          <TextField
            label={sourceName + " Role"}
            value={edgeData?.sourceRole ?? ""}
            onChange={(e) => handleSourceRoleChange(e.target.value)}
            size="small"
            fullWidth
          />

          {/* Target subheadline */}
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            {targetName}
          </Typography>

          {/* Target Multiplicity */}
          <TextField
            label={targetName + " Multiplicity"}
            value={edgeData?.targetMultiplicity ?? ""}
            onChange={(e) => handleTargetMultiplicityChange(e.target.value)}
            size="small"
            fullWidth
          />

          {/* Target Role */}
          <TextField
            label={targetName + " Role"}
            value={edgeData?.targetRole ?? ""}
            onChange={(e) => handleTargetRoleChange(e.target.value)}
            size="small"
            fullWidth
          />
        </>
      }
    </Box>
  )
}
