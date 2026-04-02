import { NodeProps, NodeResizer, type Node } from "@xyflow/react"
import { DefaultNodeWrapper } from "@/nodes/wrappers"
import { CommunicationObjectNameSVG } from "@/components"
import { useEffect, useMemo, useRef } from "react"
import { CommunicationObjectNodeProps } from "@/types"
import { useDiagramStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import {
  measureTextWidth,
  calculateMinWidth,
  calculateMinHeight,
} from "@/utils"
import { LAYOUT } from "@/constants"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { useIsOnlyThisElementSelected } from "@/hooks/useIsOnlyThisElementSelected"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"

export function CommunicationObjectName({
  id,
  width,
  height,
  data,
}: NodeProps<Node<CommunicationObjectNodeProps>>) {
  const { name, attributes = [], methods = [] } = data
  const { setNodes } = useDiagramStore(
    useShallow((state) => ({
      setNodes: state.setNodes,
    }))
  )
  const selected = useIsOnlyThisElementSelected(id)
  const isDiagramModifiable = useDiagramModifiable()
  const communicationObjectSvgWrapperRef = useRef<HTMLDivElement | null>(null)

  // Communication diagrams don't have stereotypes, so header height is consistent
  const headerHeight = LAYOUT.DEFAULT_HEADER_HEIGHT
  const attributeHeight = LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT
  const methodHeight = LAYOUT.DEFAULT_METHOD_HEIGHT
  const padding = LAYOUT.DEFAULT_PADDING
  const font = LAYOUT.DEFAULT_FONT

  // Calculate the widest text accurately
  const maxTextWidth = useMemo(() => {
    const headerTextWidth = measureTextWidth(name, font)
    const attributesTextWidths = attributes.map((attr: { name: string }) =>
      measureTextWidth(attr.name, font)
    )
    const methodsTextWidths = methods.map((method: { name: string }) =>
      measureTextWidth(method.name, font)
    )
    const allTextWidths = [
      headerTextWidth,
      ...attributesTextWidths,
      ...methodsTextWidths,
    ]

    const result = Math.max(...allTextWidths, 0)
    return result
  }, [name, attributes, methods, font])

  const minWidth = useMemo(() => {
    const result = calculateMinWidth(maxTextWidth, padding)
    return result
  }, [maxTextWidth, padding])

  // Calculate minimum dimensions
  const minHeight = useMemo(
    () =>
      calculateMinHeight(
        headerHeight,
        attributes.length,
        methods.length,
        attributeHeight,
        methodHeight
      ),
    [
      headerHeight,
      attributes.length,
      methods.length,
      attributeHeight,
      methodHeight,
    ]
  )

  useEffect(() => {
    if (height && height <= minHeight) {
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

  useEffect(() => {
    if (width && width <= minWidth) {
      setNodes((prev) =>
        prev.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              width: Math.max(width ?? 0, minWidth),
              measured: {
                width: Math.max(width ?? 0, minWidth),
              },
            }
          }
          return node
        })
      )
    }
  }, [id, setNodes, minWidth])

  const finalWidth = Math.max(width ?? 0, minWidth)

  return (
    <DefaultNodeWrapper
      width={width}
      height={height}
      elementId={id}
      className="horizontally-not-resizable"
    >
      <NodeToolbar elementId={id} />

      <NodeResizer
        nodeId={id}
        isVisible={isDiagramModifiable && !!selected}
        minWidth={minWidth}
        minHeight={minHeight}
        maxHeight={minHeight}
        handleStyle={{ width: 8, height: 8 }}
      />

      <div ref={communicationObjectSvgWrapperRef}>
        <CommunicationObjectNameSVG
          width={finalWidth}
          height={minHeight}
          data={data}
          id={id}
          showAssessmentResults={!isDiagramModifiable}
        />
      </div>
      <PopoverManager
        anchorEl={communicationObjectSvgWrapperRef.current}
        elementId={id}
        type={"communicationObjectName" as const}
      />
    </DefaultNodeWrapper>
  )
}
