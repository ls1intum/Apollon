import { NodeProps, NodeResizer, useStore, type Node } from "@xyflow/react"
import { useRef } from "react"
import { usePopoverAnchor } from "@/hooks/usePopoverAnchor"
import { DefaultNodeWrapper } from "../wrappers"
import { useHandleOnResize } from "@/hooks"
import { ActivitySwimlaneProps } from "@/types"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { getLaneOffsets, resizeLaneDivider } from "@/utils"
import { PopoverManager } from "@/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@/hooks/useDiagramModifiable"
import { ActivitySwimlaneSVG } from "@/components/svgs/nodes/activityDiagram/ActivitySwimlaneSVG"
import { NodeToolbar } from "@/components/toolbars/NodeToolbar"

const HANDLE_THICKNESS = 6

/**
 * Invisible draggable strips over the interior lane separators. Dragging one
 * does a balanced resize of the two adjacent lanes (the swimlane's outer size
 * never changes). The visible divider lines are drawn by the SVG underneath.
 */
function LaneResizeHandles({
  id,
  width,
  height,
  data,
}: {
  id: string
  width: number
  height: number
  data: ActivitySwimlaneProps
}) {
  const zoom = useStore((state) => state.transform[2])
  const setNodes = useDiagramStore(useShallow((state) => state.setNodes))
  const drag = useRef<{
    index: number
    start: number
    origLanes: ActivitySwimlaneProps["lanes"]
    primaryExtent: number
  } | null>(null)

  const lanes = data.lanes ?? []
  const isVertical = (data.orientation ?? "vertical") === "vertical"
  const primaryExtent = isVertical ? width : height
  const offsets = getLaneOffsets(lanes, primaryExtent)

  const onPointerDown = (e: React.PointerEvent, index: number) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = {
      index,
      start: isVertical ? e.clientX : e.clientY,
      origLanes: lanes,
      primaryExtent,
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const { index, start, origLanes, primaryExtent } = drag.current
    const deltaScreen = (isVertical ? e.clientX : e.clientY) - start
    const deltaPx = deltaScreen / (zoom || 1)
    const next = resizeLaneDivider(origLanes, index, deltaPx, primaryExtent)
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, lanes: next } } : n
      )
    )
  }

  const onPointerUp = (e: React.PointerEvent) => {
    drag.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  // One handle per interior separator (between lane i and i+1).
  return (
    <>
      {lanes.slice(1).map((lane, i) => {
        const pos = offsets[i + 1].start
        const style: React.CSSProperties = isVertical
          ? {
              position: "absolute",
              left: pos - HANDLE_THICKNESS / 2,
              top: 0,
              width: HANDLE_THICKNESS,
              height: "100%",
              cursor: "col-resize",
              touchAction: "none",
            }
          : {
              position: "absolute",
              top: pos - HANDLE_THICKNESS / 2,
              left: 0,
              height: HANDLE_THICKNESS,
              width: "100%",
              cursor: "row-resize",
              touchAction: "none",
            }
        return (
          <div
            key={lane.id}
            className="nodrag nopan"
            role="separator"
            aria-label="Resize lane"
            style={style}
            onPointerDown={(e) => onPointerDown(e, i)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
        )
      })}
    </>
  )
}

export function ActivitySwimlane({
  id,
  width,
  height,
  data,
  parentId,
}: NodeProps<Node<ActivitySwimlaneProps>>) {
  const [anchorEl, anchorRef] = usePopoverAnchor()
  const { onResize } = useHandleOnResize(parentId)
  const isDiagramModifiable = useDiagramModifiable()

  if (!width || !height) {
    return null
  }

  return (
    <DefaultNodeWrapper
      width={width}
      height={height}
      elementId={id}
      // A swimlane is a structural partition you drop actions into; control
      // flow connects the actions, never the partition — so it exposes no
      // connection handles.
      hiddenHandles={true}
    >
      <NodeToolbar elementId={id} />
      <NodeResizer
        isVisible={isDiagramModifiable}
        onResize={onResize}
        minHeight={120}
        minWidth={120}
        handleStyle={{ width: 8, height: 8 }}
      />
      <div ref={anchorRef} style={{ position: "relative", width, height }}>
        <ActivitySwimlaneSVG
          width={width}
          height={height}
          data={data}
          id={id}
          showAssessmentResults={!isDiagramModifiable}
        />
        {isDiagramModifiable && (
          <LaneResizeHandles
            id={id}
            width={width}
            height={height}
            data={data}
          />
        )}
      </div>

      <PopoverManager
        anchorEl={anchorEl}
        elementId={id}
        type="ActivitySwimlane"
      />
    </DefaultNodeWrapper>
  )
}
