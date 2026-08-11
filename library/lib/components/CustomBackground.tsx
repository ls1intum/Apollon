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

  // `offset` works around an operator-precedence fault in React Flow's Background, which computes
  //
  //   scaledOffset = offsetXY[0] * transform[2] || 1 + patternDimensions[0] / 2
  //
  // `*` and `+` both bind tighter than `||`, so this reads as `(offset * zoom) || (1 + gap / 2)`.
  // With the default `offset={0}` the left side is falsy, so it falls through to `1 + gap / 2` and
  // the grid renders one pixel off: for the fine grid `translate(-3.5,-3.5)` instead of
  // `translate(-2.5,-2.5)`, putting lines at `x = 4 (mod 5)` while nodes snap to `x = 0 (mod 5)`.
  // That silently broke the invariant this component exists to hold.
  //
  // Passing half the gap makes the left side truthy and evaluates to `(gap / 2) * zoom`, which is
  // exactly the `patternDimensions / 2` React Flow intends — correct at every zoom level, so it
  // needs no follow-up once upstream fixes the precedence.
  return (
    <>
      <Background
        id="1"
        gap={FINE_GRID_GAP}
        offset={FINE_GRID_GAP / 2}
        color="var(--apollon-gray, #e9ecef)"
        variant={BackgroundVariant.Lines}
      />

      <Background
        id="2"
        gap={MAJOR_GRID_GAP}
        offset={MAJOR_GRID_GAP / 2}
        color="var(--apollon-grid, rgba(36, 39, 36, 0.1))"
        variant={BackgroundVariant.Lines}
      />
    </>
  )
}
