import { useCallback } from "react"
import { useReactFlow, type Node, type XYPosition } from "@xyflow/react"
import { useShallow } from "zustand/shallow"
import { CANVAS, DROPS, type DropElementConfig } from "@/constants"
import {
  buildPaletteNode,
  getPositionOnCanvas,
  isParentNodeType,
  resizeAllParents,
  resolveTapPosition,
  snapToGrid,
} from "@/utils"
import { canDropIntoParent } from "@/utils/bpmnConstraints"
import { useDiagramStore } from "@/store/context"
import { log } from "../logger"

/**
 * Palette node creation: the two ways a palette element becomes a canvas node.
 *
 * `dropAtPointer` — a drag release, placing the node under the cursor (keeping
 * the grabbed point of the preview under the pointer).
 *
 * `placeAtViewportCenter` — a tap/keyboard activation, placing the node at the
 * centre of the visible canvas and selecting it, so it never lands hidden
 * under the palette. Consecutive taps cascade diagonally off the previously
 * placed (and still-selected) node.
 *
 * Both build nodes through `buildPaletteNode` and nest through the same
 * `findDropParent`, so a tap can never create a nesting a drag forbids.
 */
export function usePalettePlacement(
  dropElementConfig: DropElementConfig,
  previewScale: number
) {
  const snapPx = CANVAS.SNAP_TO_GRID_PX
  const { screenToFlowPosition, getIntersectingNodes } = useReactFlow()
  const {
    diagramId,
    nodes,
    setNodes,
    edges,
    setEdges,
    selectedElementIds,
    setSelectedElementsId,
    lastPlacedElementId,
    setLastPlacedElementId,
  } = useDiagramStore(
    useShallow((state) => ({
      diagramId: state.diagramId,
      nodes: state.nodes,
      setNodes: state.setNodes,
      edges: state.edges,
      setEdges: state.setEdges,
      selectedElementIds: state.selectedElementIds,
      setSelectedElementsId: state.setSelectedElementsId,
      lastPlacedElementId: state.lastPlacedElementId,
      setLastPlacedElementId: state.setLastPlacedElementId,
    }))
  )

  const getCanvas = useCallback(
    () => document.getElementById(`react-flow-library-${diagramId}`),
    [diagramId]
  )

  // The deepest parent-capable node under a flow-space point that this element
  // is allowed to drop into (BPMN nesting rules included).
  const findDropParent = useCallback(
    (hitPoint: XYPosition): Node | undefined => {
      const intersecting = getIntersectingNodes({
        x: hitPoint.x,
        y: hitPoint.y,
        width: CANVAS.MOUSE_UP_OFFSET_PX,
        height: CANVAS.MOUSE_UP_OFFSET_PX,
      }).filter(
        (node) =>
          isParentNodeType(node.type) &&
          node.type &&
          canDropIntoParent(dropElementConfig.type, node.type)
      )
      return intersecting[intersecting.length - 1]
    },
    [getIntersectingNodes, dropElementConfig.type]
  )

  // Rebase an absolute flow position into the parent found under it, returning
  // the node's local position and its parent id.
  const nestInParent = useCallback(
    (absolute: XYPosition): { position: XYPosition; parentId?: string } => {
      const parent = findDropParent(absolute)
      if (!parent) return { position: absolute }
      const parentOnCanvas = getPositionOnCanvas(parent, nodes)
      return {
        position: {
          x: absolute.x - parentOnCanvas.x,
          y: absolute.y - parentOnCanvas.y,
        },
        parentId: parent.id,
      }
    },
    [findDropParent, nodes]
  )

  // Append a freshly built node, growing any parent it nests into. Uses a
  // functional update so rapid placements never lose each other. When `select`,
  // the node becomes the sole selection (mirrors paste).
  const commitNode = useCallback(
    (
      build: (prev: Node[]) => Node,
      parentId: string | undefined,
      select: boolean
    ) => {
      setNodes((prev) => {
        const newNode = build(prev)
        const next = [...prev, newNode]
        if (parentId) resizeAllParents(newNode, next)
        return select
          ? next.map((node) =>
              node.id === newNode.id
                ? node
                : node.selected
                  ? { ...node, selected: false }
                  : node
            )
          : next
      })
    },
    [setNodes]
  )

  // Returns whether a node was actually placed (false when released off-canvas),
  // so the caller can decide whether a trailing click still needs handling.
  const dropAtPointer = useCallback(
    (
      event: { clientX: number; clientY: number },
      clickOffset: XYPosition
    ): boolean => {
      const canvas = getCanvas()
      if (!canvas) {
        log.warn("Canvas element not found")
        return false
      }

      const bounds = canvas.getBoundingClientRect()
      const outside =
        event.clientX < bounds.left ||
        event.clientY < bounds.top ||
        event.clientX > bounds.right ||
        event.clientY > bounds.bottom
      if (outside) return false

      // The drop/preview ratio maps the grabbed point's fraction of the preview
      // onto the (possibly larger) drop size, so the cursor stays over the same
      // relative point of the dropped node. Ratio is 1 when they match.
      const ratioX =
        (dropElementConfig.dropWidth ?? dropElementConfig.width) /
        dropElementConfig.width
      const ratioY =
        (dropElementConfig.dropHeight ?? dropElementConfig.height) /
        dropElementConfig.height

      // Parent is hit-tested at the snapped cursor (where the ghost is
      // anchored); the node's top-left is the cursor backed out by the offset.
      const parent = findDropParent(
        screenToFlowPosition(
          { x: event.clientX, y: event.clientY },
          { snapToGrid: true }
        )
      )
      const absolute = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      absolute.x -=
        Math.floor(((clickOffset.x / previewScale) * ratioX) / snapPx) * snapPx
      absolute.y -=
        Math.floor(((clickOffset.y / previewScale) * ratioY) / snapPx) * snapPx

      let position = absolute
      if (parent) {
        const parentOnCanvas = getPositionOnCanvas(parent, nodes)
        position = {
          x: absolute.x - parentOnCanvas.x,
          y: absolute.y - parentOnCanvas.y,
        }
      }

      commitNode(
        () =>
          buildPaletteNode(dropElementConfig, position, {
            parentId: parent?.id,
          }),
        parent?.id,
        false
      )
      return true
    },
    [
      getCanvas,
      dropElementConfig,
      findDropParent,
      screenToFlowPosition,
      previewScale,
      snapPx,
      nodes,
      commitNode,
    ]
  )

  const placeAtViewportCenter = useCallback(() => {
    const canvas = getCanvas()
    if (!canvas) {
      log.warn("Canvas element not found")
      return
    }
    const rect = canvas.getBoundingClientRect()
    const nodeWidth = dropElementConfig.dropWidth ?? dropElementConfig.width
    const nodeHeight = dropElementConfig.dropHeight ?? dropElementConfig.height

    const center = screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    })
    const topLeft = screenToFlowPosition({ x: rect.left, y: rect.top })
    const bottomRight = screenToFlowPosition({ x: rect.right, y: rect.bottom })

    // Cascade only off the node the previous tap placed, and only while it is
    // still the sole selection — so a run of taps steps diagonally, but a tap
    // after selecting some unrelated element centres instead of landing beside
    // it.
    const anchor =
      lastPlacedElementId !== null &&
      selectedElementIds.length === 1 &&
      selectedElementIds[0] === lastPlacedElementId
        ? nodes.find((node) => node.id === lastPlacedElementId)
        : undefined

    const absolute = resolveTapPosition({
      centeredPosition: snapToGrid(
        { x: center.x - nodeWidth / 2, y: center.y - nodeHeight / 2 },
        snapPx
      ),
      anchorAbsolute: anchor ? getPositionOnCanvas(anchor, nodes) : null,
      nodeWidth,
      nodeHeight,
      visibleRect: {
        minX: topLeft.x,
        minY: topLeft.y,
        maxX: bottomRight.x,
        maxY: bottomRight.y,
      },
      stepPx: DROPS.TAP_CASCADE_PX,
      snapPx,
    })

    const { position, parentId } = nestInParent(absolute)
    const newNode = buildPaletteNode(dropElementConfig, position, {
      parentId,
      selected: true,
    })
    commitNode(() => newNode, parentId, true)
    setSelectedElementsId([newNode.id])
    // commitNode only clears node.selected; a previously selected edge would
    // otherwise stay visually selected out of sync with selectedElementIds.
    if (edges.some((edge) => edge.selected)) {
      setEdges(
        edges.map((edge) =>
          edge.selected ? { ...edge, selected: false } : edge
        )
      )
    }
    setLastPlacedElementId(newNode.id)
  }, [
    getCanvas,
    dropElementConfig,
    screenToFlowPosition,
    selectedElementIds,
    nodes,
    edges,
    setEdges,
    snapPx,
    nestInParent,
    commitNode,
    setSelectedElementsId,
    lastPlacedElementId,
    setLastPlacedElementId,
  ])

  return { dropAtPointer, placeAtViewportCenter }
}
