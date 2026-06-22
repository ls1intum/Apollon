import {
  ReactFlowProvider,
  ReactFlowInstance,
  ConnectionMode,
  ReactFlow,
  type Edge,
} from "@xyflow/react"
import { type MouseEvent as ReactMouseEvent, useCallback } from "react"
import {
  CustomBackground,
  CustomControls,
  CustomMiniMap,
  ReconnectConnectionLine,
  Sidebar,
  AssessmentSelectionDebug,
  ScrollOverlay,
  AlignmentGuides,
} from "@/components"
import { OverlayLayer } from "@/overlay/OverlayLayer"
import "@xyflow/react/dist/style.css"
// Register the bundled Inter @font-face at module load, so the face exists
// before diagram <text> elements (which request the Inter family) first paint.
import "@/styles/fonts.css"
import "@/styles/app.css"
import {
  useDiagramStore,
  useMetadataStore,
  useOverlayStore,
} from "./store/context"
import { useShallow } from "zustand/shallow"
import { type CSSProperties } from "react"
import { CANVAS } from "./constants"
import { diagramEdgeTypes } from "./edges"
import {
  useNodeDragStop,
  useConnect,
  useReconnect,
  useElementInteractions,
  useDragOver,
  useNodeDrag,
} from "./hooks"
import { diagramNodeTypes } from "./nodes"
import { useDiagramModifiable } from "./hooks/useDiagramModifiable"
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts"
import { usePaneClicked } from "./hooks/usePaneClicked"
import {
  useRemoteDraggingNodes,
  applyDraggingOverlay,
} from "./hooks/useRemoteDraggingNodes"
import { ApollonMode } from "./typings"
import {
  getConnectionLineType,
  resolveReconnectPreviewBasePoints,
} from "./utils/edgeUtils"
import { IPoint } from "./edges/Connection"
import {
  CollaborationLayer,
  type CollaborationAwarenessApi,
  type CollaborationLayerOptions,
} from "@/components/collaboration/CollaborationLayer"

interface AppProps {
  onReactFlowInit: (instance: ReactFlowInstance) => void
  collaboration: CollaborationLayerOptions
  awareness: CollaborationAwarenessApi
}
const proOptions = { hideAttribution: true }
const isPointArray = (value: unknown): value is IPoint[] =>
  Array.isArray(value) &&
  value.every(
    (point) =>
      typeof point === "object" &&
      point !== null &&
      "x" in point &&
      "y" in point &&
      typeof point.x === "number" &&
      typeof point.y === "number"
  )

function App({ onReactFlowInit, collaboration, awareness }: AppProps) {
  useKeyboardShortcuts()

  const { nodes, onNodesChange, edges, onEdgesChange, diagramId, previewMode } =
    useDiagramStore(
      useShallow((state) => ({
        nodes: state.nodes,
        onNodesChange: state.onNodesChange,
        edges: state.edges,
        onEdgesChange: state.onEdgesChange,
        diagramId: state.diagramId,
        previewMode: state.previewMode,
      }))
    )

  const {
    mode,
    diagramType,
    readonly,
    scrollLock,
    scrollEnabled,
    connectionGuidanceActive,
    startReconnectPreview,
    stopReconnectPreview,
  } = useMetadataStore(
    useShallow((state) => ({
      mode: state.mode,
      diagramType: state.diagramType,
      readonly: state.readonly,
      scrollLock: state.scrollLock,
      scrollEnabled: state.scrollEnabled,
      connectionGuidanceActive: state.connectionGuidanceActive,
      startReconnectPreview: state.startReconnectPreview,
      stopReconnectPreview: state.stopReconnectPreview,
    }))
  )

  const isDiagramModifiable = useDiagramModifiable()

  // Publish the reserved overlay insets as CSS custom properties so the editor's
  // own overlays (palette, presence bar, controls, minimap) slide to make room
  // for host chrome instead of overlapping it.
  const insets = useOverlayStore((state) => state.insets)

  // Overlay the live positions/sizes of nodes peers are dragging (carried over
  // ephemeral awareness, never the document) onto what React Flow renders, so
  // remote drags stay live without per-frame CRDT writes. Suppressed during a
  // version preview (matching CollaborationLayer's other remote visuals), and a
  // no-op outside collaboration — `displayNodes` is then `nodes` by reference,
  // so React Flow re-renders nothing.
  const remoteDraggingNodes = useRemoteDraggingNodes(
    awareness,
    collaboration.enabled && !previewMode
  )
  const displayNodes = applyDraggingOverlay(nodes, remoteDraggingNodes)

  const connectionLineType = getConnectionLineType(diagramType)
  const onNodeDragStop = useNodeDragStop()
  const onNodeDrag = useNodeDrag()
  const onDragOver = useDragOver()
  const { onConnect, onConnectEnd, onConnectStart, onEdgesDelete } =
    useConnect()
  const onReconnect = useReconnect()
  const { onBeforeDelete, onNodeDoubleClick, onEdgeDoubleClick } =
    useElementInteractions()
  const { onPaneClicked } = usePaneClicked()

  const handleReactFlowInit = useCallback(
    (instance: ReactFlowInstance) => {
      onReactFlowInit(instance)
    },
    [onReactFlowInit]
  )

  const handleReconnectStart = useCallback(
    (_event: ReactMouseEvent, edge: Edge, handleType: "source" | "target") => {
      const storedPoints = isPointArray(edge.data?.points)
        ? edge.data.points
        : undefined

      startReconnectPreview(
        edge.id,
        handleType,
        resolveReconnectPreviewBasePoints(storedPoints, undefined, [])
      )
    },
    [startReconnectPreview]
  )

  const handleReconnectEnd = useCallback(() => {
    stopReconnectPreview()
  }, [stopReconnectPreview])

  return (
    <div
      className={`apollon-editor ${readonly ? "apollon-editor--readonly" : ""} ${
        connectionGuidanceActive ? "apollon-editor--connection-guidance" : ""
      }`}
      style={
        {
          display: "flex",
          height: "100%",
          width: "100%",
          overflow: "hidden",
          backgroundColor: "var(--apollon-background, #ffffff)",
          position: "relative",
          // Only emit the inset custom properties when chrome actually reserves
          // room, so an editor with no overlays keeps the exact original style
          // attribute (byte-identical DOM for embedders like Artemis).
          ...(insets.top || insets.right || insets.bottom || insets.left
            ? {
                "--apollon-inset-top": `${insets.top}px`,
                "--apollon-inset-right": `${insets.right}px`,
                "--apollon-inset-bottom": `${insets.bottom}px`,
                "--apollon-inset-left": `${insets.left}px`,
              }
            : {}),
        } as CSSProperties
      }
    >
      {mode === ApollonMode.Modelling && !readonly && <Sidebar />}
      <div className="apollon-canvas">
        <ReactFlow
          id={`react-flow-library-${diagramId}`}
          className="apollon-container"
          nodeTypes={diagramNodeTypes}
          edgeTypes={diagramEdgeTypes}
          nodes={displayNodes}
          edges={edges}
          onDragOver={onDragOver}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnectStart={onConnectStart}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onConnectEnd={onConnectEnd}
          zoomOnDoubleClick={false}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onReconnect={onReconnect}
          onReconnectStart={handleReconnectStart}
          onReconnectEnd={handleReconnectEnd}
          connectionLineType={connectionLineType}
          connectionLineComponent={ReconnectConnectionLine}
          connectionMode={ConnectionMode.Loose}
          // Lift the selected edge (and its bend/endpoint handles) above other
          // edges so an overlapping edge's interaction ribbon can't steal the
          // pointer from a visible handle.
          elevateEdgesOnSelect
          onInit={(instance) => {
            instance.fitView({ maxZoom: 1.0, minZoom: 1.0 })
            handleReactFlowInit(instance)
          }}
          minZoom={CANVAS.MIN_SCALE_TO_ZOOM_OUT}
          maxZoom={CANVAS.MAX_SCALE_TO_ZOOM_IN}
          snapToGrid
          snapGrid={[CANVAS.SNAP_TO_GRID_PX, CANVAS.SNAP_TO_GRID_PX]}
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onBeforeDelete={onBeforeDelete}
          onPaneClick={onPaneClicked}
          proOptions={proOptions}
          edgesReconnectable={isDiagramModifiable}
          nodesConnectable={isDiagramModifiable}
          nodesDraggable={isDiagramModifiable}
          panOnScroll={!scrollLock || scrollEnabled}
          zoomOnScroll={!scrollLock || scrollEnabled}
        >
          <CustomBackground />
          <CustomMiniMap />
          <CustomControls />
          <AlignmentGuides />
          <AssessmentSelectionDebug />
          {/* Host-injected canvas chrome (header, rails, controls). */}
          <OverlayLayer />
        </ReactFlow>
        <ScrollOverlay />
        <CollaborationLayer options={collaboration} awareness={awareness} />
      </div>
    </div>
  )
}

export function AppWithProvider(props: AppProps) {
  return (
    <ReactFlowProvider>
      <App {...props} />
    </ReactFlowProvider>
  )
}
