import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { Typography } from "@/components/ui"
import { AssessmentHeader, PopoverSection } from "./PopoverLayout"

// Mirrors the popover spacing scale documented in PopoverLayout (the gap
// between controls inside a section). Kept in step with that constant so the
// See box stays on the same rhythm as GiveFeedbackAssessmentBox.
const FIELD_GAP = 8

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
          gap: FIELD_GAP,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="caption">Score</Typography>
        <Typography sx={{ fontWeight: 600 }}>
          {assessment?.score ?? "-"}
        </Typography>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: FIELD_GAP }}>
        <Typography variant="caption">Feedback</Typography>
        <Typography>{assessment?.feedback || "-"}</Typography>
      </div>
    </PopoverSection>
  )
}
