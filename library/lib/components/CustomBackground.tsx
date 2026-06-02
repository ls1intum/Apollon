import { Background, BackgroundVariant } from "@xyflow/react"
import { CANVAS } from "@/constants"

export const CustomBackground = () => {
  // Read the snap step at render time, not module init: constants.ts pulls in
  // the components barrel, so a top-level read here can resolve to undefined.
  //
  // The fine grid is drawn at exactly the snap step so every grid-snapped node
  // position and connection point sits on a visible grid line; a coarser major
  // grid every 10th line keeps the canvas readable without burying that.
  const FINE_GRID_GAP = CANVAS.SNAP_TO_GRID_PX
  const MAJOR_GRID_GAP = CANVAS.SNAP_TO_GRID_PX * 10

  return (
    <>
      <Background
        id="1"
        gap={FINE_GRID_GAP}
        color="var(--apollon-gray, #e9ecef)"
        variant={BackgroundVariant.Lines}
      />

      <Background
        id="2"
        gap={MAJOR_GRID_GAP}
        color="var(--apollon-grid, rgba(36, 39, 36, 0.1))"
        variant={BackgroundVariant.Lines}
      />
    </>
  )
}
