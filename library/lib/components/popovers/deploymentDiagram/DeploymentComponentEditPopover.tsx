import { useDiagramStore } from "@/store"
import { DeploymentComponentProps } from "@/types"
import { useShallow } from "zustand/shallow"
import { DefaultNodeEditPopover } from "../DefaultNodeEditPopover"
import { PopoverProps } from "../types"
import { HeaderSwitchElement } from "@/components"
import { useLabels } from "@/i18n/useLabels"
import { PopoverSection } from "../PopoverLayout"

export const DeploymentComponentEditPopover: React.FC<PopoverProps> = ({
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

  // The «component» stereotype toggle gets its own row below the style editor,
  // not crammed beside the paint roller on the name row.
  return (
    <DefaultNodeEditPopover elementId={elementId}>
      <PopoverSection title={t.stereotype} divider>
        <HeaderSwitchElement
          onClick={switchHeaderShown}
          isComponentHeaderShown={nodeData.isComponentHeaderShown}
          stereotypeLabel="component"
        />
      </PopoverSection>
    </DefaultNodeEditPopover>
  )
}
