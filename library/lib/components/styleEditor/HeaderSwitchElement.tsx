import React from "react"
import { Tooltip } from "@/components/ui"

interface Props {
  onClick: () => void
  isComponentHeaderShown: boolean
  /** Fixed stereotype word for the node kind, e.g. "component". */
  stereotypeLabel: string
  /**
   * The node's editable stereotype value, when it has one (e.g. a deployment
   * node the user labelled "device"). When set and non-empty it's shown in the
   * toggle in place of `stereotypeLabel`, so the chip tracks the actual name.
   */
  stereotypeValue?: string
}
export const HeaderSwitchElement: React.FC<Props> = ({
  onClick,
  isComponentHeaderShown,
  stereotypeLabel,
  stereotypeValue,
}) => {
  const displayLabel = stereotypeValue?.trim() || stereotypeLabel
  const buttonLabel = `\u00ab${displayLabel}\u00bb`
  const accessibleLabel = `${displayLabel} stereotype`
  const tooltipLabel = `${
    isComponentHeaderShown ? "Hide" : "Show"
  } ${displayLabel} stereotype`

  return (
    <Tooltip title={tooltipLabel}>
      <button
        type="button"
        className="apollon-stereotype-toggle"
        // Active styling keys on `data-state="on"` (`aria-pressed` matches no
        // CSS rule on its own), so keep the two in sync.
        data-state={isComponentHeaderShown ? "on" : "off"}
        aria-pressed={isComponentHeaderShown}
        aria-label={accessibleLabel}
        onClick={onClick}
      >
        <span aria-hidden="true">{buttonLabel}</span>
      </button>
    </Tooltip>
  )
}
