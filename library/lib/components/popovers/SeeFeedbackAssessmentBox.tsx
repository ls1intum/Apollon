import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { Typography } from "@/components/ui"
import { AssessmentHeader, PopoverSection } from "./PopoverLayout"

export const SeeFeedbackAssessmentBox = ({
  type,
  typeLabel,
  name,
  elementId,
  divider = false,
}: {
  type: string
  /** Display-only label for the header (e.g. "Edge"). Defaults to `type`. */
  typeLabel?: string
  name: string
  elementId: string
  /** Draw a separator above this box. Off for the first box in a popover. */
  divider?: boolean
}) => {
  const getAssessment = useDiagramStore(
    useShallow((state) => state.getAssessment)
  )
  const assessment = getAssessment(elementId)

  return (
    <PopoverSection divider={divider}>
      <AssessmentHeader type={typeLabel ?? type} name={name} />
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography sx={{ opacity: 0.7 }}>Score</Typography>
        <Typography sx={{ fontWeight: 600 }}>
          {assessment?.score ?? "-"}
        </Typography>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <Typography sx={{ opacity: 0.7 }}>Feedback</Typography>
        <Typography>{assessment?.feedback || "-"}</Typography>
      </div>
    </PopoverSection>
  )
}
