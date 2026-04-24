import { DefaultNodeProps } from "@/types"
import { useDiagramStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { PopoverProps } from "./types"
import { NodeStyleEditor } from "../ui"
import { rendersNameLabel, supportsMultilineName } from "@/utils/nodeUtils"

export const DefaultNodeEditPopover: React.FC<PopoverProps> = ({
  elementId,
  children,
  sideElements = [],
  placeholder,
}) => {
  const { nodes, setNodes } = useDiagramStore(
    useShallow((state) => ({
      nodes: state.nodes,
      setNodes: state.setNodes,
    }))
  )

  const handleDataFieldUpdate = (key: string, value: string) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === elementId) {
          return {
            ...node,
            data: {
              ...node.data,
              [key]: value,
            },
          }
        }
        return node
      })
    )
  }

  const node = nodes.find((node) => node.id === elementId)
  if (!node) {
    return null
  }

  const nodeData = node.data as DefaultNodeProps

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
      }}
    >
      <NodeStyleEditor
        nodeData={nodeData}
        handleDataFieldUpdate={handleDataFieldUpdate}
        sideElements={sideElements}
        inputPlaceholder={placeholder}
        showNameInputChange={rendersNameLabel(node.type)}
        isMultilineName={supportsMultilineName(node.type)}
      />

      {children}
    </div>
  )
}
