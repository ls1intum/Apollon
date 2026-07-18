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
  AssessmentSelectionDebug,
  ScrollOverlay,
  AlignmentGuides,
} from "@/components"
// Imported DIRECTLY, not via the `@/components` barrel: this component pulls in the
// edge-geometry solver to preview the committed auto route, and the barrel is
// imported by `constants.ts`, so routing it through the barrel forms a
// `constants → components → solver → edgeAnchoring` import cycle that leaves module
// constants undefined at init. The direct path keeps the solver out of the barrel.
import { ReconnectConnectionLine } from "@/components/ReconnectConnectionLine"
import { OverlayLayer } from "@/overlay/OverlayLayer"
import "@xyflow/react/dist/style.css"
// Shared, embed-safe @tumaet/ui primitives + --apollon-/--home- design tokens
// (Tailwind-free, Preflight-free). Loaded here rather than `@import`-ed from
// app.css so app.css stays `@import`-free for the verbatim headless-export
// inline (see exportStyles.ts / exportSelfContained.test.ts).
import "../../packages/ui/dist/components.css"
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
import { useMultiSelectionMode } from "./hooks/useMultiSelectionMode"
import { usePaneClicked } from "./hooks/usePaneClicked"
import {
  useRemoteDraggingNodes,
  applyDraggingOverlay,
} from "./hooks/useRemoteDraggingNodes"
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
import { TooltipProvider } from "@/components/ui"
import { EdgeGeometrySolver } from "@/components/EdgeGeometrySolver"

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
    diagramType,
    readonly,
    scrollLock,
    scrollEnabled,
    keyboardShortcuts,
    connectionGuidanceActive,
    startReconnectPreview,
    stopReconnectPreview,
  } = useMetadataStore(
    useShallow((state) => ({
      diagramType: state.diagramType,
      readonly: state.readonly,
      scrollLock: state.scrollLock,
      scrollEnabled: state.scrollEnabled,
      keyboardShortcuts: state.keyboardShortcuts,
      connectionGuidanceActive: state.connectionGuidanceActive,
      startReconnectPreview: state.startReconnectPreview,
      stopReconnectPreview: state.stopReconnectPreview,
    }))
  )

  const isDiagramModifiable = useDiagramModifiable()

  // The reserved-room rect, published as CSS custom properties for fitView and
  // unmanaged React Flow panels that still opt into top/bottom offsets.
  // Built-in chrome is grid-managed, so side-rail insets are camera reservation
  // rather than generic panel offsets.
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
  const multiSelectionMode = useMultiSelectionMode()

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
    <TooltipProvider>
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
            // Fit-view and unmanaged top/bottom panels read these (0 when
            // no chrome reserves that edge).
            "--apollon-inset-top": `${insets.top}px`,
            "--apollon-inset-right": `${insets.right}px`,
            "--apollon-inset-bottom": `${insets.bottom}px`,
            "--apollon-inset-left": `${insets.left}px`,
          } as CSSProperties
        }
      >
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
            onInit={(instance: ReactFlowInstance) => {
              // fitView on an empty canvas stays queued until nodes exist, then
              // fires on the first one and jerks the viewport. Only fit with
              // content; empty keeps the default (0,0)/zoom-1.
              if (instance.getNodes().length > 0) {
                instance.fitView({ maxZoom: 1.0, minZoom: 1.0 })
              }
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
            // Shift is also selectionKeyCode's default, but there's no conflict:
            // a click on a node and a Shift+drag on the pane are different
            // surfaces.
            multiSelectionKeyCode={["Shift", "Meta", "Control"]}
            // With multiSelectionActive forced on, React Flow's pointerdown
            // select would toggle the pressed node OUT of the selection and drop
            // it from the group drag; selecting on click keeps the group whole.
            selectNodesOnDrag={!multiSelectionMode}
            // In the mode, a plain left-drag on the pane draws a selection box;
            // panning moves to middle/right-drag (scroll/trackpad already pans
            // by default). This is mouse-only by construction: d3-zoom gates the
            // pan buttons on `mousedown` alone, so a touch drag ignores the [1,2]
            // gate and keeps panning through the separate touch handler — which
            // is why a one-finger drag never box-selects and pinch-zoom survives.
            selectionOnDrag={multiSelectionMode}
            panOnDrag={multiSelectionMode ? [1, 2] : true}
            // Delete the current selection with either key (Backspace on macOS,
            // Delete on full keyboards) — but hand these keys back with the
            // editor's other shortcuts when a host opts out via
            // `keyboardShortcuts: false`. `onBeforeDelete` additionally blocks a
            // delete whose focus is inside an overlay over the canvas.
            deleteKeyCode={keyboardShortcuts ? ["Backspace", "Delete"] : []}
            // Arrow-key node nudging + Enter/Escape selection a11y are React
            // Flow's; disable them together with the rest when shortcuts are off.
            disableKeyboardA11y={!keyboardShortcuts}
          >
            <CustomBackground />
            <AlignmentGuides />
            <AssessmentSelectionDebug />
            <EdgeGeometrySolver />
            {/* Renders every registered control (built-in + host-injected) into
                its region: header, rails, corners, on-canvas. The chrome itself is
                registered at construction (imperative) or by the React wrapper. */}
            <OverlayLayer />
          </ReactFlow>
          <ScrollOverlay />
          <CollaborationLayer options={collaboration} awareness={awareness} />
        </div>
      </div>
    </TooltipProvider>
  )
}

export function AppWithProvider(props: AppProps) {
  return (
    <ReactFlowProvider>
      <App {...props} />
    </ReactFlowProvider>
  )
}
