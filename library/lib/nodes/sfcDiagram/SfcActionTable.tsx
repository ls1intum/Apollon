import { NodeProps, NodeResizer, type Node } from "@xyflow/react"
import { DefaultNodeWrapper } from "../wrappers"
import { useRef, useMemo, useEffect } from "react"
import { useDiagramStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { useIsOnlyThisElementSelected } from "@/hooks/useIsOnlyThisElementSelected"
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
  const svgWrapperRef = useRef<HTMLDivElement | null>(null)
  const isDiagramModifiable = useDiagramModifiable()
  const selected = useIsOnlyThisElementSelected(id)

  const { setNodes } = useDiagramStore(
    useShallow((state) => ({
      setNodes: state.setNodes,
    }))
  )

  if (!width || !height) {
    return null
  }

  const actionRows = data?.actionRows || []

  // Calculate minimum height based on rows (no header needed)
  const minHeight = useMemo(() => {
    const rowsHeight = actionRows.length * LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT
    // Ensure minimum height for at least one row
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

  return (
    <DefaultNodeWrapper width={width} height={height} elementId={id}>
      <NodeToolbar elementId={id} />

      <NodeResizer
        nodeId={id}
        isVisible={isDiagramModifiable && !!selected}
        minWidth={120}
        minHeight={minHeight}
        maxHeight={minHeight}
        handleStyle={{ width: 8, height: 8 }}
      />

      <div ref={svgWrapperRef}>
        <SfcActionTableNodeSVG
          width={width}
          height={minHeight}
          id={id}
          data={data}
        />
      </div>

      <PopoverManager
        anchorEl={svgWrapperRef.current}
        elementId={id}
        type="SfcActionTable"
      />
    </DefaultNodeWrapper>
  )
}
