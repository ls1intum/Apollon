import {
  ReactFlowProvider,
  ReactFlowInstance,
  ConnectionMode,
  ReactFlow,
} from "@xyflow/react"
import { useCallback } from "react"
import {
  CustomBackground,
  CustomControls,
  CustomMiniMap,
  Sidebar,
  SvgMarkers,
  AssessmentSelectionDebug,
  ScrollOverlay,
  AlignmentGuides,
} from "@/components"
import "@xyflow/react/dist/style.css"
import "@/styles/app.css"
import { useDiagramStore, useMetadataStore } from "./store/context"
import { useShallow } from "zustand/shallow"
import {
  MIN_SCALE_TO_ZOOM_OUT,
  MAX_SCALE_TO_ZOOM_IN,
  SNAP_TO_GRID_PX,
} from "./constants"
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
import { ApollonMode } from "./typings"
import { getConnectionLineType } from "./utils/edgeUtils"

interface AppProps {
  onReactFlowInit: (instance: ReactFlowInstance) => void
}
const proOptions = { hideAttribution: true }

function App({ onReactFlowInit }: AppProps) {
  useKeyboardShortcuts()

  const { nodes, onNodesChange, edges, onEdgesChange, diagramId } =
    useDiagramStore(
      useShallow((state) => ({
        nodes: state.nodes,
        onNodesChange: state.onNodesChange,
        edges: state.edges,
        onEdgesChange: state.onEdgesChange,
        diagramId: state.diagramId,
      }))
    )

  const { mode, diagramType, readonly, scrollLock, scrollEnabled } =
    useMetadataStore(
      useShallow((state) => ({
        mode: state.mode,
        diagramType: state.diagramType,
        readonly: state.readonly,
        scrollLock: state.scrollLock,
        scrollEnabled: state.scrollEnabled,
      }))
    )

  const isDiagramModifiable = useDiagramModifiable()

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

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        backgroundColor: "var(--apollon2-background)",
        position: "relative",
      }}
    >
      {mode === ApollonMode.Modelling && !readonly && <Sidebar />}
      <SvgMarkers />
      <ReactFlow
        id={`react-flow-library-${diagramId}`}
        className="apollon-container"
        nodeTypes={diagramNodeTypes}
        edgeTypes={diagramEdgeTypes}
        nodes={nodes}
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
        connectionLineType={connectionLineType}
        connectionMode={ConnectionMode.Loose}
        onInit={(instance) => {
          instance.fitView({ maxZoom: 1.0, minZoom: 1.0 })
          handleReactFlowInit(instance)
        }}
        minZoom={MIN_SCALE_TO_ZOOM_OUT}
        maxZoom={MAX_SCALE_TO_ZOOM_IN}
        snapToGrid
        snapGrid={[SNAP_TO_GRID_PX, SNAP_TO_GRID_PX]}
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
      </ReactFlow>
      <ScrollOverlay />
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
