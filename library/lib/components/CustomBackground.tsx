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
  // Passing an offset makes the left side truthy and evaluates to `offset * zoom`, which is what
  // the upstream code intends to land at `patternDimensions / 2`.
  //
  // React Flow strokes each line down the middle of its tile, so a line lands at
  // `gap / 2 - offset`. The extra half pixel puts every line on a whole device pixel: a 1px line
  // straddling two renders at half intensity, and WebKit rasterises the fine tile once and repeats
  // it, so on a 1x display a half-intensity line drops out of the bitmap and takes whole grid lines
  // with it. Both layers must be nudged identically — the offset scales with zoom, so shifting only
  // one splits into a visible double line as you zoom in.
  const HALF_PIXEL_NUDGE = 0.5
  const crispOffset = (gap: number) => gap / 2 + HALF_PIXEL_NUDGE

  return (
    <>
      <Background
        id="1"
        gap={FINE_GRID_GAP}
        offset={crispOffset(FINE_GRID_GAP)}
        color="var(--apollon-gray, #e9ecef)"
        variant={BackgroundVariant.Lines}
      />

      <Background
        id="2"
        gap={MAJOR_GRID_GAP}
        offset={crispOffset(MAJOR_GRID_GAP)}
        color="var(--apollon-grid, rgba(36, 39, 36, 0.1))"
        variant={BackgroundVariant.Lines}
      />
    </>
  )
}
