import { useDiagramStore } from "@/store"
import { DeploymentNodeProps } from "@/types"
import { useShallow } from "zustand/shallow"
import { DefaultNodeEditPopover } from "../DefaultNodeEditPopover"
import { PopoverProps } from "../types"
import { TextField } from "@/components/ui"
import { HeaderSwitchElement } from "@/components/styleEditor"
import { PopoverSection } from "../PopoverLayout"

export const DeploymentNodeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
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

  const HeaderSwitcher = (
    <HeaderSwitchElement
      onClick={switchHeaderShown}
      isComponentHeaderShown={nodeData.isComponentHeaderShown}
      stereotypeLabel="node"
      stereotypeValue={nodeData.stereotype}
    />
  )

  return (
    <DefaultNodeEditPopover
      elementId={elementId}
      sideElements={[HeaderSwitcher]}
    >
      <PopoverSection title="Stereotype" divider>
        <TextField
          value={nodeData.stereotype}
          onChange={(e) => handleStereotypeChange(e.target.value)}
          onBlur={() => handleStereotypeChange(nodeData.stereotype)}
          size="small"
          placeholder="e.g. «device»"
          fullWidth
        />
      </PopoverSection>
    </DefaultNodeEditPopover>
  )
}
