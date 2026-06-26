import { ComponentSubsystemNodeProps } from "@/types"
import { DefaultNodeEditPopover } from "../DefaultNodeEditPopover"
import { PopoverProps } from "../types"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { HeaderSwitchElement } from "@/components/styleEditor"
export const ComponentSubsystemEditPopover: React.FC<PopoverProps> = ({
  elementId,
}: PopoverProps) => {
  const { nodes, setNodes } = useDiagramStore(
    useShallow((state) => ({
      nodes: state.nodes,
      setNodes: state.setNodes,
    }))
  )

  const node = nodes.find((node) => node.id === elementId)
  if (!node) {
    return null
  }

  const nodeData = node.data as ComponentSubsystemNodeProps

  const switchHeaderShown = () => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === elementId) {
          return {
            ...node,
            data: {
              ...node.data,
              isComponentSubsystemHeaderShown:
                !nodeData.isComponentSubsystemHeaderShown,
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
      isComponentHeaderShown={nodeData.isComponentSubsystemHeaderShown}
      stereotypeLabel="subsystem"
    />
  )

  return (
    <DefaultNodeEditPopover
      elementId={elementId}
      sideElements={[HeaderSwitcher]}
      placeholder="Subsystem name"
    />
  )
}
