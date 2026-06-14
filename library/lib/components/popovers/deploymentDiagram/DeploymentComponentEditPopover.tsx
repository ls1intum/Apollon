import { useDiagramStore } from "@/store"
import { DeploymentComponentProps } from "@/types"
import { useShallow } from "zustand/shallow"
import { DefaultNodeEditPopover } from "../DefaultNodeEditPopover"
import { PopoverProps } from "../types"
import { HeaderSwitchElement } from "@/components"

export const DeploymentComponentEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const { nodes, setNodes } = useDiagramStore(
    useShallow((state) => ({ setNodes: state.setNodes, nodes: state.nodes }))
  )

  const node = nodes.find((node) => node.id === elementId)
  if (!node) {
    return null
  }

  const nodeData = node.data as DeploymentComponentProps

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
      stereotypeLabel="component"
    />
  )

  return (
    <DefaultNodeEditPopover
      elementId={elementId}
      sideElements={[HeaderSwitcher]}
    />
  )
}
