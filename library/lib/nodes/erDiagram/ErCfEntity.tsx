import { NodeProps, NodeResizer, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@/hooks/usePopoverAnchor"
import { DefaultNodeWrapper } from "@/nodes/wrappers"
import { ErCfEntitySVG } from "@/components"
import { useEffect, useMemo } from "react"
import { ErCfEntityProps } from "@/types"
import { useDiagramStore } from "@/store/context"
import { useShallow } from "zustand/shallow"
import {
  measureTextWidth,
  calculateMinWidth,
  calculateMinHeight,
} from "@/utils"
import {
  ER_CF_KEY_GUTTER_WIDTH,
  ER_CF_COLUMN_GAP,
} from "@/components/svgs/nodes/erDiagram/ErCfRowSection"
import { LAYOUT } from "@/constants"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"

export function ErCfEntity({
  id,
  width,
  height,
  data,
}: NodeProps<Node<ErCfEntityProps>>) {
  const { setNodes } = useDiagramStore(
    useShallow((state) => ({ setNodes: state.setNodes }))
  )
  const { name, attributes } = data
  const isDiagramModifiable = useDiagramModifiable()
  const [anchorEl, anchorRef] = usePopoverAnchor()

  const headerHeight = LAYOUT.DEFAULT_HEADER_HEIGHT
  const attributeHeight = LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT
  const padding = LAYOUT.DEFAULT_PADDING
  const font = LAYOUT.DEFAULT_FONT

  // Columns are globally aligned, so the box must fit the widest name PLUS the
  // widest type (not the widest single row), or a type on a short-name row clips.
  const maxTextWidth = useMemo(() => {
    const maxNameWidth = Math.max(
      0,
      ...attributes.map((a) => measureTextWidth(a.name, font))
    )
    const maxTypeWidth = Math.max(
      0,
      ...attributes.map((a) => (a.type ? measureTextWidth(a.type, font) : 0))
    )
    const bodyWidth =
      ER_CF_KEY_GUTTER_WIDTH +
      maxNameWidth +
      (maxTypeWidth > 0 ? ER_CF_COLUMN_GAP + maxTypeWidth : 0)
    return Math.max(measureTextWidth(name, font), bodyWidth, 0)
  }, [name, attributes, font])

  const minWidth = useMemo(
    () => calculateMinWidth(maxTextWidth, padding),
    [maxTextWidth, padding]
  )
  const minHeight = useMemo(
    () =>
      // A table entity has a single (attribute) compartment, so the method
      // count/height are zero.
      calculateMinHeight(
        headerHeight,
        attributes.length,
        0,
        attributeHeight,
        0
      ),
    [headerHeight, attributes.length, attributeHeight]
  )

  useEffect(() => {
    if (height && height <= minHeight) {
      setNodes((prev) =>
        prev.map((node) =>
          node.id === id
            ? {
                ...node,
                height: minHeight,
                measured: { ...node.measured, height: minHeight },
              }
            : node
        )
      )
    }
  }, [minHeight, height, id, setNodes])

  useEffect(() => {
    if (width && width <= minWidth) {
      setNodes((prev) =>
        prev.map((node) =>
          node.id === id
            ? {
                ...node,
                width: Math.max(width ?? 0, minWidth),
                measured: { width: Math.max(width ?? 0, minWidth) },
              }
            : node
        )
      )
    }
  }, [id, setNodes, minWidth, width])

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
        isVisible={isDiagramModifiable}
        minWidth={minWidth}
        minHeight={minHeight}
        maxHeight={minHeight}
        handleStyle={{ width: 8, height: 8 }}
      />
      <div ref={anchorRef}>
        <ErCfEntitySVG
          width={finalWidth}
          height={minHeight}
          data={data}
          id={id}
          showAssessmentResults={!isDiagramModifiable}
        />
      </div>

      <PopoverManager anchorEl={anchorEl} elementId={id} type="ErCfEntity" />
    </DefaultNodeWrapper>
  )
}
