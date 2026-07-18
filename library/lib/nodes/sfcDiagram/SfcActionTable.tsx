import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@/hooks/usePopoverAnchor"
import { DefaultNodeWrapper, NodeResizer } from "../wrappers"
import { useMemo, useEffect } from "react"
import { useDiagramStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { SfcActionTableProps } from "@/types"
import { SfcActionTableNodeSVG } from "@/components"
import { LAYOUT } from "@/constants"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"

export function SfcActionTable({
  id,
  width,
  height,
  data,
}: NodeProps<Node<SfcActionTableProps>>) {
  const [anchorEl, anchorRef] = usePopoverAnchor()
  const isDiagramModifiable = useDiagramModifiable()

  const { setNodes } = useDiagramStore(
    useShallow((state) => ({
      setNodes: state.setNodes,
    }))
  )

  const actionRows = data?.actionRows || []

  const minHeight = useMemo(() => {
    const rowsHeight = actionRows.length * LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT
    return Math.max(rowsHeight, LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT)
  }, [actionRows.length])

  // Auto-expand height when content changes (like class diagram)
  useEffect(() => {
    if (height && height < minHeight) {
      setNodes((prev) =>
        prev.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              height: minHeight,
              measured: {
                ...node.measured,
                height: minHeight,
              },
            }
          }
          return node
        })
      )
    }
  }, [minHeight, height, id, setNodes])

  if (!width || !height) {
    return null
  }

  return (
    <DefaultNodeWrapper width={width} height={height} elementId={id}>
      <NodeToolbar elementId={id} />

      <NodeResizer
        nodeId={id}
        isVisible={isDiagramModifiable}
        minWidth={120}
        minHeight={minHeight}
        maxHeight={minHeight}
      />

      <div ref={anchorRef}>
        <SfcActionTableNodeSVG
          width={width}
          height={minHeight}
          id={id}
          data={data}
        />
      </div>

      <PopoverManager
        anchorEl={anchorEl}
        elementId={id}
        type="SfcActionTable"
      />
    </DefaultNodeWrapper>
  )
}
