import {
  ReactFlowProvider,
  ReactFlowInstance,
  ConnectionMode,
  ReactFlow,
} from "@xyflow/react"
import { useCallback } from "react"
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
import { ConnectionPreviewLine } from "@/components/ConnectionPreviewLine"
import { ArcScalePublisher } from "@/components/ArcScalePublisher"
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
  useEdgeGeometryStore,
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
  useElementInteractions,
  useDragOver,
  useNodeDrag,
} from "./hooks"
import { diagramNodeTypes } from "./nodes"
import { useDiagramModifiable } from "./hooks/useDiagramModifiable"
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts"
import { useKeyboardScope } from "./hooks/useKeyboardScope"
import { useMultiSelectionMode } from "./hooks/useMultiSelectionMode"
import { usePaneClicked } from "./hooks/usePaneClicked"
import {
  useRemoteDraggingNodes,
  applyDraggingOverlay,
} from "./hooks/useRemoteDraggingNodes"
import { getConnectionLineType } from "./utils/edgeUtils"
import { applyAssessmentFocus } from "./utils/assessmentFocus"
import { usePopoverStore } from "@/store/context"
import { ApollonMode } from "./typings"
import {
  CollaborationLayer,
  type CollaborationAwarenessApi,
  type CollaborationLayerOptions,
} from "@/components/collaboration/CollaborationLayer"
import { TooltipProvider } from "@/components/ui"
import { EdgeGeometrySolver } from "@/components/EdgeGeometrySolver"
import {
  ApollonPortalContainerProvider,
  ApollonPortalRoot,
} from "@/components/ui/portalContainer"

interface AppProps {
  onReactFlowInit: (instance: ReactFlowInstance) => void
  collaboration: CollaborationLayerOptions
  awareness: CollaborationAwarenessApi
  /** Disabled by the off-screen export mount, which must materialize the whole
   * model regardless of its synthetic viewport. */
  onlyRenderVisibleElements?: boolean
}
const proOptions = { hideAttribution: true }
function App({
  onReactFlowInit,
  collaboration,
  awareness,
  onlyRenderVisibleElements = true,
}: AppProps) {
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
    mode,
    readonly,
    scrollLock,
    scrollEnabled,
    keyboardShortcuts,
    connectionGuidanceActive,
  } = useMetadataStore(
    useShallow((state) => ({
      diagramType: state.diagramType,
      mode: state.mode,
      readonly: state.readonly,
      scrollLock: state.scrollLock,
      scrollEnabled: state.scrollEnabled,
      keyboardShortcuts: state.keyboardShortcuts,
      connectionGuidanceActive: state.connectionGuidanceActive,
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
  // The element whose feedback popover is open stays visibly marked for as long
  // as that form is mounted — see `applyAssessmentFocus`.
  //
  // Assessment only: `popoverElementId` is set by every popover in every mode, and
  // amber means "marked for feedback". Editing selection stays blue.
  const openPopoverElementId = usePopoverStore(
    (state) => state.popoverElementId
  )
  const assessedElementId =
    mode === ApollonMode.Assessment ? openPopoverElementId : null
  const displayNodes = applyAssessmentFocus(
    applyDraggingOverlay(nodes, remoteDraggingNodes),
    assessedElementId
  )
  const displayEdges = applyAssessmentFocus(edges, assessedElementId)

  const connectionLineType = getConnectionLineType(diagramType)
  const onNodeDragStop = useNodeDragStop()
  const onNodeDrag = useNodeDrag()
  const onDragOver = useDragOver()
  const { onConnect, onConnectEnd, onConnectStart, onEdgesDelete } =
    useConnect()
  const {
    onBeforeDelete,
    onNodeClick,
    onEdgeClick,
    onNodeDoubleClick,
    onEdgeDoubleClick,
  } = useElementInteractions()
  const { onPaneClicked } = usePaneClicked()
  const multiSelectionMode = useMultiSelectionMode()
  const routingReady = useEdgeGeometryStore((state) => state.routingReady)
  const {
    rootRef,
    active: keyboardScopeActive,
    rootHandlers,
  } = useKeyboardScope(keyboardShortcuts)
  useKeyboardShortcuts(rootRef)

  const handleReactFlowInit = useCallback(
    (instance: ReactFlowInstance) => {
      onReactFlowInit(instance)
    },
    [onReactFlowInit]
  )

  return (
    <TooltipProvider>
      <div
        ref={rootRef}
        tabIndex={-1}
        {...rootHandlers}
        className={`apollon-editor ${readonly ? "apollon-editor--readonly" : ""} ${
          mode === ApollonMode.Assessment ? "apollon-editor--assessment" : ""
        } ${
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
            // The solver reads DiagramStore directly. Keep provisional React
            // Flow edges unmounted until this model's first exact generation;
            // nodes still mount below so their runtime handles can be measured.
            edges={routingReady ? displayEdges : []}
            // React Flow's viewport culling keeps large off-screen diagrams out
            // of the DOM while the central solver still optimizes every edge.
            // This is purely a rendering boundary: export and exact geometry
            // continue to use the complete diagram.
            // Bootstrap one complete measurement pass before enabling viewport
            // culling. Otherwise off-screen nodes never mount their handles and
            // the holistic router cannot produce a stable first generation.
            onlyRenderVisibleElements={
              routingReady ? onlyRenderVisibleElements : false
            }
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
            connectionLineType={connectionLineType}
            connectionLineComponent={ConnectionPreviewLine}
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
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onEdgeDoubleClick={onEdgeDoubleClick}
            onBeforeDelete={onBeforeDelete}
            onPaneClick={onPaneClicked}
            proOptions={proOptions}
            edgesReconnectable={false}
            nodesConnectable={isDiagramModifiable}
            nodesDraggable={isDiagramModifiable}
            panOnScroll={!scrollLock || scrollEnabled}
            zoomOnScroll={!scrollLock || scrollEnabled}
            // React Flow calls preventDefault() on every wheel over the pane
            // unless told otherwise, INDEPENDENTLY of panOnScroll/zoomOnScroll.
            // Leaving it on turned scroll lock into a dead zone: the canvas
            // refused to zoom and the host page refused to scroll, so an editor
            // embedded in a form could not be scrolled past at all. The lock's
            // whole promise is that the wheel belongs to the page until the zoom
            // modifier is held.
            preventScrolling={!scrollLock || scrollEnabled}
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
            // Deletion runs through the editor-root shortcut dispatcher. React
            // Flow's built-in handler listens on document and would otherwise
            // delete a selection while the user is elsewhere on the host page.
            deleteKeyCode={null}
            // Arrow-key node nudging + Enter/Escape selection a11y are React
            // Flow's; disable them together with the rest when shortcuts are off.
            disableKeyboardA11y={!keyboardScopeActive}
            // React Flow implements these modifier keys with window/document
            // listeners. Mount them only while this editor owns the interaction,
            // so the page and sibling editors retain their keyboard contracts.
            selectionKeyCode={keyboardScopeActive ? "Shift" : null}
            multiSelectionKeyCode={
              keyboardScopeActive ? ["Shift", "Meta", "Control"] : null
            }
            panActivationKeyCode={keyboardScopeActive ? "Space" : null}
            zoomActivationKeyCode={
              keyboardScopeActive ? ["Meta", "Control"] : null
            }
          >
            <CustomBackground />
            <ArcScalePublisher />
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
        <ApollonPortalRoot />
      </div>
    </TooltipProvider>
  )
}

export function AppWithProvider(props: AppProps) {
  return (
    <ReactFlowProvider>
      <ApollonPortalContainerProvider>
        <App {...props} />
      </ApollonPortalContainerProvider>
    </ReactFlowProvider>
  )
}
