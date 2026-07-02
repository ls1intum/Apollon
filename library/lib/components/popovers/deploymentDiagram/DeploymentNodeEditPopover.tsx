import { useDiagramStore } from "@/store"
import { DeploymentNodeProps } from "@/types"
import { useShallow } from "zustand/shallow"
import { DefaultNodeEditPopover } from "../DefaultNodeEditPopover"
import { PopoverProps } from "../types"
import { TextField } from "@/components/ui"
import { HeaderSwitchElement } from "@/components/styleEditor"
import { useLabels } from "@/i18n/useLabels"
import { PopoverSection } from "../PopoverLayout"

export const DeploymentNodeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const t = useLabels()
  const { nodes, setNodes } = useDiagramStore(
    useShallow((state) => ({ setNodes: state.setNodes, nodes: state.nodes }))
  )

  const node = nodes.find((node) => node.id === elementId)
  if (!node) {
    return null
  }

  const nodeData = node.data as DeploymentNodeProps

  const handleStereotypeChange = (newStereotype: string) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === elementId) {
          return {
            ...node,
            data: {
              ...node.data,
              stereotype: newStereotype,
            },
          }
        }
        return node
      })
    )
  }

  const switchHeaderShown = () => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === elementId) {
          return {
            ...node,
            data: {
              ...node.data,
              isComponentHeaderShown: !nodeData.isComponentHeaderShown,
            },
          }
        }
        return node
      })
    )
  }

  // One Stereotype section below the style editor holds both the «node» toggle
  // and the editable value — no second copy crammed onto the name row.
  return (
    <DefaultNodeEditPopover elementId={elementId}>
      <PopoverSection title={t.stereotype} divider>
        <HeaderSwitchElement
          onClick={switchHeaderShown}
          isComponentHeaderShown={nodeData.isComponentHeaderShown}
          stereotypeLabel="node"
          stereotypeValue={nodeData.stereotype}
        />
        <TextField
          value={nodeData.stereotype}
          onChange={(e) => handleStereotypeChange(e.target.value)}
          onBlur={() => handleStereotypeChange(nodeData.stereotype)}
          placeholder={t.stereotypePlaceholder}
          fullWidth
        />
      </PopoverSection>
    </DefaultNodeEditPopover>
  )
}
