import { NodeProps, type Node } from "@xyflow/react"
import { DefaultNodeWrapper } from "../wrappers"
import { useRef, useMemo, useEffect } from "react"
import { useDiagramStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { DefaultNodeProps } from "@/types"
import { SfcJumpNodeSVG } from "@/components"
import { measureTextWidth, calculateMinWidth } from "@/utils"
import { LAYOUT } from "@/constants"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"

export function SfcJump({
  id,
  width,
  height,
  data,
}: NodeProps<Node<DefaultNodeProps>>) {
  const { name } = data || {}
  const svgWrapperRef = useRef<HTMLDivElement | null>(null)

  const { setNodes } = useDiagramStore(
    useShallow((state) => ({
      setNodes: state.setNodes,
    }))
  )

  if (!width || !height) {
    return null
  }

  // Calculate minimum width based on text
  const minWidth = useMemo(() => {
    const textWidth = measureTextWidth(name || "", LAYOUT.DEFAULT_FONT) + 8
    return calculateMinWidth(textWidth, LAYOUT.DEFAULT_PADDING)
  }, [name])

  // Auto-expand/shrink width when text changes
  useEffect(() => {
    if (width && width !== minWidth) {
      setNodes((prev) =>
        prev.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              width: minWidth,
              measured: {
                ...node.measured,
                width: minWidth,
              },
            }
          }
          return node
        })
      )
    }
  }, [minWidth, width, id, setNodes])

  const finalWidth = Math.max(width ?? 0, minWidth)

  return (
    <DefaultNodeWrapper width={finalWidth} height={height} elementId={id}>
      <NodeToolbar elementId={id} />

      <div ref={svgWrapperRef}>
        <SfcJumpNodeSVG
          width={finalWidth}
          height={height}
          data={data}
          id={id}
        />
      </div>

      <PopoverManager
        anchorEl={svgWrapperRef.current}
        elementId={id}
        type="default"
      />
    </DefaultNodeWrapper>
  )
}
