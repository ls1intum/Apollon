import { DefaultNodeEditPopover } from "../DefaultNodeEditPopover"
import { PopoverProps } from "../types"
import { DescribedNodeSection } from "./DescribedNodeSection"

/**
 * An artifact has no stereotype row, so this is the default node popover plus
 * the Technology + Description pair its two siblings also get.
 */
export const DeploymentArtifactEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => (
  <DefaultNodeEditPopover elementId={elementId}>
    <DescribedNodeSection elementId={elementId} />
  </DefaultNodeEditPopover>
)
