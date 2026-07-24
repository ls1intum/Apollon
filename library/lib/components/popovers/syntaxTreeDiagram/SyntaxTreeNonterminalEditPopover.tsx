import { DefaultNodeEditPopover } from "../DefaultNodeEditPopover"
import { PopoverProps } from "../types"
import { useLabels } from "@/i18n/useLabels"

export const SyntaxTreeNonterminalEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const t = useLabels()
  return (
    <DefaultNodeEditPopover elementId={elementId} placeholder={t.nonterminal} />
  )
}
