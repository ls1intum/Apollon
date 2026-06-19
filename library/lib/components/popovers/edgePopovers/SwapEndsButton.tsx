import { Box, IconButton } from "@mui/material"
import { SwapHorizIcon } from "@/components/Icon"

/**
 * Swaps an edge's source and target ends. A labelled, native icon button so the
 * control is reachable by keyboard and announced to assistive tech — the bare
 * `<svg onClick>` it replaces was mouse-only. Rendered in the edge style
 * editor's side slot, hence the flex-end wrapper.
 */
export const SwapEndsButton: React.FC<{ onClick: () => void }> = ({
  onClick,
}) => (
  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
    <IconButton
      size="small"
      aria-label="Swap source and target"
      onClick={onClick}
    >
      <SwapHorizIcon width={20} height={20} />
    </IconButton>
  </Box>
)
