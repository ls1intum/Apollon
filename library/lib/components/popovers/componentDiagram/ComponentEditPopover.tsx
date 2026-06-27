import { ComponentNodeProps } from "@/types"
import { DefaultNodeEditPopover } from "../DefaultNodeEditPopover"
import { PopoverProps } from "../types"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { HeaderSwitchElement } from "@/components"
import { PopoverSection } from "../PopoverLayout"

export const ComponentEditPopover: React.FC<PopoverProps> = ({
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

  const nodeData = node.data as ComponentNodeProps

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

  // The «component» stereotype toggle gets its own row below the style editor,
  // not crammed beside the paint roller on the name row.
  return (
    <DefaultNodeEditPopover elementId={elementId} placeholder="Component name">
      <PopoverSection title="Stereotype" divider>
        <HeaderSwitchElement
          onClick={switchHeaderShown}
          isComponentHeaderShown={nodeData.isComponentHeaderShown}
          stereotypeLabel="component"
        />
      </PopoverSection>
    </DefaultNodeEditPopover>
  )
}
