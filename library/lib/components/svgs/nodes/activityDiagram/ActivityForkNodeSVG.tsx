import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { DefaultNodeProps } from "@/types"

interface ActivityForkNodeSVGProps extends SVGComponentProps {
  data: DefaultNodeProps
}
export const ActivityForkNodeSVG: React.FC<ActivityForkNodeSVGProps> = ({
  id,
  width,
  height,
  svgAttributes,
  data,
  SIDEBAR_PREVIEW_SCALE,
  showAssessmentResults = false,
}) => {
  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const nodeScore = assessments[id]?.score
  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)

  const fillColor = data.fillColor || "var(--apollon2-primary-contrast)"

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      <rect x={0} y={0} width={width} height={height} fill={fillColor} />

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
