import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"

export const ActivityFinalNodeSVG: React.FC<SVGComponentProps> = ({
  id,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  showAssessmentResults = false,
  width,
  height,
}) => {
  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const nodeScore = assessments[id]?.score
  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      <circle
        cx={width / 2}
        cy={height / 2}
        r={width / 2}
        fill="var(--apollon2-primary-contrast)"
      />
      <circle
        cx={width / 2}
        cy={height / 2}
        r={(width / 2) * 0.8}
        fill="var(--apollon2-primary-contrast)"
        stroke="var(--apollon2-background)"
        strokeWidth={2}
      />

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
