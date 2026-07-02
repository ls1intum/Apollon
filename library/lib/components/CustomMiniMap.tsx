import { useState } from "react"
import {
  MiniMap,
  MiniMapNodeProps,
  Panel,
  useStore,
  type PanelPosition,
} from "@xyflow/react"
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpLeft,
  ArrowUpRight,
  Map,
} from "lucide-react"
import { useReactiveNode } from "@/hooks/useReactiveElement"
import { useLabels } from "@/i18n/useLabels"
import {
  ClassSVG,
  PackageSVG,
  ActivitySVG,
  ActivitySwimlaneSVG,
  ActivityInitialNodeSVG,
  ActivityFinalNodeSVG,
  ActivityActionNodeSVG,
  ActivityObjectNodeSVG,
  ActivityMergeNodeSVG,
  ActivityForkNodeSVG,
  ActivityForkNodeHorizontalSVG,
  UseCaseNodeSVG,
  UseCaseSystemNodeSVG,
  UseCaseActorNodeSVG,
  ComponentInterfaceNodeSVG,
  ComponentSubsystemNodeSVG,
  ComponentNodeSVG,
  DeploymentNodeSVG,
  DeploymentComponentSVG,
  DeploymentArtifactSVG,
  DeploymentInterfaceSVG,
  SfcStartNodeSVG,
  SfcStepNodeSVG,
  SfcActionTableNodeSVG,
  SfcJumpNodeSVG,
  SfcTransitionBranchNodeSVG,
  FlowchartTerminalNodeSVG,
  FlowchartProcessNodeSVG,
  FlowchartDecisionNodeSVG,
  FlowchartInputOutputNodeSVG,
  FlowchartFunctionCallNodeSVG,
  SyntaxTreeTerminalNodeSVG,
  SyntaxTreeNonterminalNodeSVG,
  ObjectNameSVG,
  CommunicationObjectNameSVG,
  PetriNetPlaceSVG,
  PetriNetTransitionSVG,
  BPMNTaskNodeSVG,
  BPMNEventNodeSVG,
  BPMNGatewayNodeSVG,
  BPMNSubprocessNodeSVG,
  BPMNAnnotationNodeSVG,
  BPMNDataObjectNodeSVG,
  BPMNDataStoreNodeSVG,
  BPMNPoolNodeSVG,
  BPMNGroupNodeSVG,
  ReachabilityGraphMarkingSVG,
} from "./svgs"
import { DiagramNodeType } from "@/typings"
import {
  BPMNEventProps,
  BPMNGatewayProps,
  BPMNSubprocessProps,
  BPMNTaskProps,
  ClassNodeProps,
  CommunicationObjectNodeProps,
  ComponentNodeProps,
  ComponentSubsystemNodeProps,
  DefaultNodeProps,
  ActivitySwimlaneProps,
  DeploymentComponentProps,
  DeploymentNodeProps,
  ObjectNodeProps,
  PetriNetPlaceProps,
  ReachabilityGraphMarkingProps,
  SfcActionTableProps,
  SfcTransitionBranchNodeProps,
} from "@/types/nodes/NodeProps"

export interface CustomMiniMapProps {
  /** Corner the minimap and its toggle anchor to. Default `"bottom-right"`. */
  position?: PanelPosition
  /** Drag the minimap to pan the diagram. Default `true`. */
  pannable?: boolean
  /** Scroll over the minimap to zoom the diagram. Default `true`. */
  zoomable?: boolean
}

// The collapse affordance points toward the corner the minimap tucks into, so it
// stays intuitive at every position (a top-left minimap collapses up-left, not
// down-right). Center positions bias to the nearest vertical edge's right.
const COLLAPSE_ARROW: Partial<Record<PanelPosition, typeof ArrowDownRight>> = {
  "top-left": ArrowUpLeft,
  "top-center": ArrowUpRight,
  "top-right": ArrowUpRight,
  "bottom-left": ArrowDownLeft,
  "bottom-center": ArrowDownRight,
  "bottom-right": ArrowDownRight,
}

// Below this canvas width the expanded minimap can't share the bottom edge with
// the zoom cluster without overlapping (a ~250px zoom + ~200px minimap don't fit),
// so the minimap stays collapsed to its toggle — the standard small-screen
// behaviour (tldraw/Figma hide or collapse the minimap on narrow viewports). The
// collapsed toggle is tiny and never collides.
const MINIMAP_EXPAND_MIN_WIDTH = 640

export const CustomMiniMap = ({
  position = "bottom-right",
  pannable = true,
  zoomable = true,
}: CustomMiniMapProps = {}) => {
  const [minimapCollapsed, setMinimapCollapsed] = useState(true)
  const t = useLabels()
  const CollapseArrow = COLLAPSE_ARROW[position] ?? ArrowDownRight
  // Force-collapse on narrow canvases so the expanded card can't overlap the zoom
  // cluster; it re-expands automatically when there's room again.
  const canvasWidth = useStore((s) => s.width)
  const tooNarrowToExpand =
    canvasWidth > 0 && canvasWidth < MINIMAP_EXPAND_MIN_WIDTH

  if (minimapCollapsed || tooNarrowToExpand) {
    return (
      <Panel position={position}>
        <button
          type="button"
          className="apollon-chrome-iconbtn"
          aria-label={t.showMinimap}
          title={t.showMinimapHint}
          onClick={() => setMinimapCollapsed(false)}
        >
          <Map width={18} height={18} aria-hidden="true" />
        </button>
      </Panel>
    )
  }

  // Expanded: the MiniMap renders as its own glass card (a React Flow Panel), and
  // the collapse arrow is a SIBLING Panel at the same corner that is IDENTICAL to
  // the collapsed open button (same glass panel + .apollon-chrome-iconbtn) — so
  // toggling reads as one control and the cursor never moves. Rendering the
  // MiniMap normally (not nested) keeps its sizing intact; a tight offsetScale
  // avoids a fat empty margin around the diagram.
  return (
    <>
      <MiniMap
        zoomable={zoomable}
        pannable={pannable}
        position={position}
        nodeComponent={MiniMapNode}
        offsetScale={6}
        bgColor="transparent"
        className="apollon-minimap"
      />
      <Panel position={position}>
        <button
          type="button"
          className="apollon-chrome-iconbtn"
          aria-label={t.hideMinimap}
          title={t.hideMinimap}
          onClick={() => setMinimapCollapsed(true)}
        >
          <CollapseArrow width={18} height={18} aria-hidden="true" />
        </button>
      </Panel>
    </>
  )
}

function MiniMapNode({ id, x, y }: MiniMapNodeProps) {
  // Subscribe so the minimap preview tracks node data/size changes; an
  // imperative getNode() read goes stale once the compiler memoizes this.
  const nodeInfo = useReactiveNode(id)
  if (!nodeInfo) return null

  switch (nodeInfo.type as DiagramNodeType) {
    case "class":
      return (
        <ClassSVG
          svgAttributes={{ x, y }}
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as ClassNodeProps}
        />
      )
    case "package":
      return (
        <PackageSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "objectName":
      return (
        <ObjectNameSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as ObjectNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "activity":
      return (
        <ActivitySVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          data={nodeInfo.data as DefaultNodeProps}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
        />
      )
    case "activitySwimlane":
      return (
        <ActivitySwimlaneSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          data={nodeInfo.data as ActivitySwimlaneProps}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
        />
      )
    case "activityInitialNode":
      return (
        <ActivityInitialNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
        />
      )
    case "activityFinalNode":
      return (
        <ActivityFinalNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
        />
      )
    case "activityActionNode":
      return (
        <ActivityActionNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          data={nodeInfo.data as DefaultNodeProps}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
        />
      )
    case "activityObjectNode":
      return (
        <ActivityObjectNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          data={nodeInfo.data as DefaultNodeProps}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
        />
      )
    case "activityMergeNode":
      return (
        <ActivityMergeNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "activityForkNode":
      return (
        <ActivityForkNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          data={nodeInfo.data as DefaultNodeProps}
        />
      )
    case "activityForkNodeHorizontal":
      return (
        <ActivityForkNodeHorizontalSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          data={nodeInfo.data as DefaultNodeProps}
        />
      )
    case "useCase":
      return (
        <UseCaseNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "useCaseActor":
      return (
        <UseCaseActorNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "useCaseSystem":
      return (
        <UseCaseSystemNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )

    case "component":
      return (
        <ComponentNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as ComponentNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "componentSubsystem":
      return (
        <ComponentSubsystemNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as ComponentSubsystemNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "componentInterface":
      return (
        <ComponentInterfaceNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "deploymentNode":
      return (
        <DeploymentNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          data={nodeInfo.data as DeploymentNodeProps}
        />
      )
    case "deploymentComponent":
      return (
        <DeploymentComponentSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          data={nodeInfo.data as DeploymentComponentProps}
        />
      )
    case "deploymentArtifact":
      return (
        <DeploymentArtifactSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          data={nodeInfo.data as DefaultNodeProps}
        />
      )
    case "deploymentInterface":
      return (
        <DeploymentInterfaceSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "sfcStart":
      return (
        <SfcStartNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "sfcStep":
      return (
        <SfcStepNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "sfcActionTable":
      return (
        <SfcActionTableNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as SfcActionTableProps}
          svgAttributes={{ x, y }}
        />
      )
    case "sfcTransitionBranch":
      return (
        <SfcTransitionBranchNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as SfcTransitionBranchNodeProps}
          svgAttributes={{ x, y }}
        />
      )

    case "sfcJump":
      return (
        <SfcJumpNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )

    case "flowchartTerminal":
      return (
        <FlowchartTerminalNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "flowchartProcess":
      return (
        <FlowchartProcessNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "flowchartDecision":
      return (
        <FlowchartDecisionNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "flowchartInputOutput":
      return (
        <FlowchartInputOutputNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "flowchartFunctionCall":
      return (
        <FlowchartFunctionCallNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "syntaxTreeNonterminal":
      return (
        <SyntaxTreeNonterminalNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "syntaxTreeTerminal":
      return (
        <SyntaxTreeTerminalNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "communicationObjectName":
      return (
        <CommunicationObjectNameSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          data={nodeInfo.data as CommunicationObjectNodeProps}
        />
      )
    case "petriNetPlace":
      return (
        <PetriNetPlaceSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          data={nodeInfo.data as PetriNetPlaceProps}
        />
      )
    case "petriNetTransition":
      return (
        <PetriNetTransitionSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          data={nodeInfo.data as DefaultNodeProps}
        />
      )
    case "bpmnTask":
      return (
        <BPMNTaskNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as BPMNTaskProps}
          svgAttributes={{ x, y }}
        />
      )
    case "bpmnStartEvent":
      return (
        <BPMNEventNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          variant="start"
          data={nodeInfo.data as BPMNEventProps}
        />
      )
    case "bpmnIntermediateEvent":
      return (
        <BPMNEventNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          variant="intermediate"
          data={nodeInfo.data as BPMNEventProps}
        />
      )
    case "bpmnEndEvent":
      return (
        <BPMNEventNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as BPMNEventProps}
          svgAttributes={{ x, y }}
          variant="end"
        />
      )
    case "bpmnGateway":
      return (
        <BPMNGatewayNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as BPMNGatewayProps}
          svgAttributes={{ x, y }}
        />
      )
    case "bpmnSubprocess":
      return (
        <BPMNSubprocessNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as BPMNSubprocessProps}
          svgAttributes={{ x, y }}
        />
      )
    case "bpmnTransaction":
      return (
        <BPMNSubprocessNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as BPMNSubprocessProps}
          svgAttributes={{ x, y }}
          variant="transaction"
        />
      )
    case "bpmnCallActivity":
      return (
        <BPMNSubprocessNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as BPMNSubprocessProps}
          svgAttributes={{ x, y }}
          variant="call"
        />
      )
    case "bpmnAnnotation":
      return (
        <BPMNAnnotationNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "bpmnDataObject":
      return (
        <BPMNDataObjectNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "bpmnDataStore":
      return (
        <BPMNDataStoreNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "bpmnPool":
      return (
        <BPMNPoolNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "bpmnGroup":
      return (
        <BPMNGroupNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "reachabilityGraphMarking":
      return (
        <ReachabilityGraphMarkingSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          data={nodeInfo.data as ReachabilityGraphMarkingProps}
        />
      )

    default:
      return <rect x={x} y={y} width={100} height={100} fill="gray" />
  }
}
